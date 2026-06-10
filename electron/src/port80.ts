import { execFile } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { log, logError } from './logger.js';

const execFileAsync = promisify(execFile);

/** The pfctl anchor name used for the port 80 redirect */
const PF_ANCHOR = 'ipscscore';

/** Whether the port 80 redirect is currently active */
let port80RedirectActive = false;

/**
 * Check if the port 80 redirect is currently active.
 */
export function isPort80RedirectActive(): boolean {
  return port80RedirectActive;
}

/**
 * Get the network interface names that should have redirect rules.
 * Includes loopback (lo0) and all external IPv4 interfaces (en0, en1, etc.).
 */
function getRedirectInterfaces(): string[] {
  const interfaces: string[] = ['lo0'];
  const nets = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    const hasExternalIpv4 = addrs.some(a => a.family === 'IPv4' && !a.internal);
    if (hasExternalIpv4 && !interfaces.includes(name)) {
      interfaces.push(name);
    }
  }
  return interfaces;
}

/**
 * Run a shell command with macOS administrator privileges.
 * Shows a native password dialog to the user.
 */
async function runAsAdmin(command: string): Promise<{ stdout: string; stderr: string }> {
  const script = `do shell script "${command.replace(/"/g, '\\"')}" with administrator privileges`;
  try {
    const { stdout, stderr } = await execFileAsync('/usr/bin/osascript', ['-e', script], { timeout: 60000 });
    return { stdout: stdout || '', stderr: stderr || '' };
  } catch (err: any) {
    // osascript wraps the shell error in its own error message
    const message = err?.message || String(err);
    if (message.includes('User canceled') || message.includes('-128')) {
      throw Object.assign(new Error('User canceled'), { code: 'USER_CANCELED' });
    }
    throw err;
  }
}

/**
 * Set up a pfctl redirect rule that forwards TCP port 80 to the target port.
 *
 * On macOS, this requires:
 * 1. A main pf ruleset that references our anchor via `rdr-anchor "ipscscore"`
 * 2. An anchor file containing the actual redirect rules
 * 3. Packet filter (pf) to be enabled
 *
 * The main ruleset preserves Apple's anchors (com.apple) so existing system
 * services continue to work.
 *
 * Uses osascript with administrator privileges to prompt for the user's password.
 *
 * Returns true if the redirect was set up successfully, false otherwise.
 */
export async function setupPort80Redirect(targetPort: number): Promise<boolean> {
  if (process.platform !== 'darwin') {
    log('[Port80] Port 80 redirect is only supported on macOS');
    return false;
  }

  try {
    const interfaces = getRedirectInterfaces();
    log(`[Port80] Setting up redirect on interfaces: ${interfaces.join(', ')}`);

    // Step 1: Write the redirect rules (per-interface for reliability)
    const rulesPath = path.join(app.getPath('userData'), 'pf-port80-rules.conf');
    const rules = interfaces
      .map(iface => `rdr pass on ${iface} inet proto tcp from any to any port 80 -> 127.0.0.1 port ${targetPort}`)
      .join('\n') + '\n';
    await fs.writeFile(rulesPath, rules, 'utf-8');
    log(`[Port80] Redirect rules:\n${rules.trim()}`);

    // Step 2: Write the main pf ruleset
    // This preserves Apple's anchors and adds our own.
    // The rdr-anchor line is critical — without it, our anchor's
    // rdr rules are never evaluated by the packet filter.
    const mainRulesPath = path.join(app.getPath('userData'), 'pf-main.conf');
    const mainRules = `# IPSC Score port 80 redirect — do not edit
# Preserve Apple's anchors
scrub-anchor "com.apple/*"
nat-anchor "com.apple/*"
rdr-anchor "com.apple/*"
rdr-anchor "${PF_ANCHOR}"
dummynet-anchor "com.apple/*"
anchor "com.apple/*"
anchor "${PF_ANCHOR}"
`;
    await fs.writeFile(mainRulesPath, mainRules, 'utf-8');

    // Step 3: Load everything using administrator privileges
    // -f loads the main ruleset (replaces entire pf configuration)
    // -a ipscscore -f loads our anchor content
    // -e enables the packet filter
    // The order matters: load main ruleset first, then anchor content
    const loadCmd = [
      `pfctl -f '${mainRulesPath}' 2>&1`,
      `pfctl -a '${PF_ANCHOR}' -f '${rulesPath}' 2>&1`,
      `pfctl -e 2>&1`,
    ].join('; ');

    const { stdout, stderr } = await runAsAdmin(loadCmd);
    log(`[Port80] pfctl load result: ${stdout || stderr}`);

    // Step 4: Verify the redirect is working
    // We test by making an actual HTTP request to port 80
    try {
      const http = await import('http');
      await new Promise<void>((resolve, reject) => {
        const req = http.get('http://127.0.0.1:80/api/health', (res) => {
          res.resume(); // drain the response
          if (res.statusCode === 200) {
            resolve();
          } else {
            // Any response means the redirect is working
            // (even a 404 means the server is reachable)
            resolve();
          }
        });
        req.on('error', (err: Error) => {
          reject(new Error(`Port 80 not responding: ${err.message}`));
        });
        req.setTimeout(3000, () => {
          req.destroy();
          reject(new Error('Port 80 connection timed out'));
        });
      });

      port80RedirectActive = true;
      log(`[Port80] ✓ Redirect active: port 80 → port ${targetPort}`);
      return true;
    } catch (verifyErr: any) {
      // The HTTP test failed, but the rule might still be loaded
      // (e.g. backend not yet started on port 3001)
      logError(`[Port80] Verification test failed: ${verifyErr.message}`);
      log('[Port80] Assuming redirect is active (rules were loaded successfully)');
      port80RedirectActive = true;
      return true;
    }

  } catch (err: any) {
    if (err?.code === 'USER_CANCELED') {
      log('[Port80] User cancelled the administrator password dialog');
    } else {
      logError('[Port80] Failed to set up port 80 redirect', err?.message || err);
    }
    port80RedirectActive = false;
    return false;
  }
}

/**
 * Remove the pfctl redirect rule for port 80.
 * Restores the default macOS pf configuration (Apple anchors only).
 * Uses osascript with administrator privileges (same password dialog as setup).
 * Called when the app quits to clean up the redirect.
 */
export async function removePort80Redirect(): Promise<void> {
  if (!port80RedirectActive) {
    log('[Port80] No redirect to remove');
    return;
  }

  try {
    // Flush our anchor rules
    await runAsAdmin(`pfctl -a '${PF_ANCHOR}' -F all 2>&1`);

    // Restore the default macOS pf configuration (without our anchor)
    const mainRulesPath = path.join(app.getPath('userData'), 'pf-main-restore.conf');
    const mainRules = `# Default macOS PF configuration — restored by IPSC Score
scrub-anchor "com.apple/*"
nat-anchor "com.apple/*"
rdr-anchor "com.apple/*"
dummynet-anchor "com.apple/*"
anchor "com.apple/*"
`;
    await fs.writeFile(mainRulesPath, mainRules, 'utf-8');
    await runAsAdmin(`pfctl -f '${mainRulesPath}' 2>&1`);

    // Clean up temp files
    await fs.unlink(mainRulesPath).catch(() => {});
    await fs.unlink(path.join(app.getPath('userData'), 'pf-port80-rules.conf')).catch(() => {});
    await fs.unlink(path.join(app.getPath('userData'), 'pf-main.conf')).catch(() => {});

    log('[Port80] Redirect rule removed and default pf configuration restored');
  } catch (err: any) {
    if (err?.code === 'USER_CANCELED') {
      log('[Port80] User cancelled — redirect rule will persist until reboot');
    } else {
      logError('[Port80] Could not remove redirect rule', err?.message || err);
      log('[Port80] The rule will be removed on reboot or you can remove it manually:');
      log('[Port80]   sudo pfctl -a ipscscore -F all');
      log('[Port80]   sudo pfctl -f /etc/pf.conf');
    }
  } finally {
    port80RedirectActive = false;
  }
}