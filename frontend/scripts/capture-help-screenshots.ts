/**
 * Capture help-system screenshots by driving the running dev server with
 * Playwright. Run with: npm run screenshots
 *
 * Requires:
 *   - backend on http://localhost:3001 (default admin password "admin")
 *   - frontend on http://localhost:5173
 *   - "Demo Help Match" seeded via `npm run seed:help-fixture`
 */
import { chromium, Page, ViewportSize } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'docs', 'screenshots');

const DESKTOP: ViewportSize = { width: 1280, height: 800 };
const MOBILE: ViewportSize = { width: 390, height: 844 };

interface Shot {
  name: string;
  viewport: ViewportSize;
  setup: (page: Page) => Promise<void>;
}

async function login(page: Page) {
  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  // Already logged in?
  const helpBtn = page.locator('button[title*="Help"], button[title*="Pomoc"]');
  if (await helpBtn.isVisible({ timeout: 2000 }).catch(() => false)) return;

  // Wait for the password input to appear (AdminLoginPage)
  await page.locator('input[type="password"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('input[type="password"]').press('Enter');
  await helpBtn.waitFor({ state: 'visible', timeout: 20000 });

  // Wait a moment for the AppLayout's auto-select-current-match effect to
  // populate activeMatchId (added for the help screenshot pipeline: Stages
  // and Registration need the current match to render their data).
  await page.waitForTimeout(1500);
}

async function clickTab(page: Page, label: RegExp | string) {
  // The TabBar is the only div.no-print that is a <main>-level horizontal tab
  // strip below the header. It has a unique container class signature:
  // "no-print border-b ... bg-white dark:bg-gray-900" + child buttons with
  // the tab icon+label. The header badges (LanUrlBadge "Scoring" pill that
  // opens the QR modal) live inside the dark <header> element, not in this
  // container. We target by class signature to be safe.
  const tabbar = page.locator('div.no-print.border-b.bg-white, div.no-print.border-b.dark\\:bg-gray-900').first();
  const tryInTabbar = async (re: RegExp) => {
    const loc = tabbar.getByRole('button', { name: re }).first();
    if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
      await loc.click();
      return true;
    }
    return false;
  };
  let clicked = false;
  if (typeof label === 'string') {
    clicked = await tryInTabbar(new RegExp(label, 'i'));
  } else {
    const alts = label.source.split('|').map((s) => s.trim());
    for (const alt of alts) {
      clicked = await tryInTabbar(new RegExp(alt, 'i'));
      if (clicked) break;
    }
  }
  if (!clicked) {
    // Fallback: any matching button anywhere on the page
    const re = typeof label === 'string' ? new RegExp(label, 'i') : new RegExp(label.source.split('|')[0], 'i');
    await page.getByRole('button', { name: re }).first().click();
  }
  await page.waitForTimeout(800);
}

async function waitForContent(page: Page, text: string, timeoutMs = 8000) {
  await page.locator(`text=${text}`).first().waitFor({ state: 'visible', timeout: timeoutMs }).catch(() => {});
}

async function pickShooter(page: Page, name: string) {
  // Open the shooter picker modal, then click the shooter.
  const opener = page.locator('text=Select a shooter').first();
  if (await opener.isVisible({ timeout: 3000 }).catch(() => false)) {
    await opener.click();
    await page.waitForTimeout(500);
  }
  const item = page.locator(`text=${name}`).first();
  if (await item.isVisible({ timeout: 3000 }).catch(() => false)) {
    await item.click();
    await page.waitForTimeout(800);
  }
}

async function shot(page: Page, name: string) {
  const path = join(OUT_DIR, name);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${name}`);
}

const SHOTS: Shot[] = [
  // Admin views — desktop
  {
    name: 'matches-list.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Matches|Preteky/);
      await waitForContent(page, 'Demo Help Match');
    },
  },
  {
    name: 'match-detail.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Matches|Preteky/);
      await waitForContent(page, 'Demo Help Match');
      await page.locator('text=Demo Help Match').first().click();
      await page.waitForTimeout(800);
    },
  },
  {
    name: 'create-match-modal.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Matches|Preteky/);
      await waitForContent(page, 'Demo Help Match');
      const btn = page.getByRole('button', { name: /\+\s*New Match|New Match|Nové preteky/i }).first();
      if (await btn.count()) await btn.click();
      await page.waitForTimeout(800);
    },
  },
  {
    name: 'stages-list.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Stages|Etapy/);
      await waitForContent(page, 'Stage 1', 12000);
    },
  },
  {
    name: 'stage-form-modal.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Stages|Etapy/);
      await waitForContent(page, 'Stage 1');
      const btn = page.getByRole('button', { name: /Add Stage|Pridať etapu/i }).first();
      if (await btn.count()) await btn.click();
      await page.waitForTimeout(800);
    },
  },
  {
    name: 'registration-list.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Registration|Registrácia/);
      await waitForContent(page, 'Smith', 12000);
    },
  },
  {
    name: 'edit-registration-modal.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Registration|Registrácia/);
      await waitForContent(page, 'Smith');
      // Click first "Edit" icon in the table
      const editBtn = page.locator('button[aria-label*="Edit"], button[title*="Edit"], button[title*="Upraviť"]').first();
      if (await editBtn.count()) {
        await editBtn.click();
        await page.waitForTimeout(800);
      }
    },
  },
  {
    name: 'squadding-modal.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Registration|Registrácia/);
      await waitForContent(page, 'Smith');
      const btn = page.getByRole('button', { name: /Squadding|Družstvá/i }).first();
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(1200);
      }
    },
  },
  // Scoring on desktop
  {
    name: 'scoring-desktop-ipsc.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Sco|Zad/);
      await waitForContent(page, 'Stage 1', 12000);
      await pickShooter(page, 'John Smith');
    },
  },
  {
    name: 'scoring-desktop-idpa.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Sco|Zad/);
      await waitForContent(page, 'Stage 1');
      const stage3 = page.getByRole('button', { name: /Stage 3|Etapa 3/i }).first();
      if (await stage3.count()) await stage3.click();
      await page.waitForTimeout(800);
      await pickShooter(page, 'John Smith');
    },
  },
  {
    name: 'scoring-desktop-summary.png',
    viewport: DESKTOP,
    setup: async (page) => {
      // Stand-in: open results — admin doesn't see the remote-scorer summary
      // view, so we capture the results page as a representative "data view"
      await clickTab(page, /Results|Výsledky/);
      await waitForContent(page, 'By Division|Podľa divízie', 12000);
    },
  },
  {
    name: 'dq-confirm-modal.png',
    viewport: DESKTOP,
    setup: async (page) => {
      // Open the DQ modal from the scoring sheet
      await clickTab(page, /Sco|Zad/);
      await waitForContent(page, 'Stage 1', 12000);
      await pickShooter(page, 'John Smith');
      const dqBtn = page.getByRole('button', { name: /DQ Shooter/i }).first();
      if (await dqBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dqBtn.click();
        await page.waitForTimeout(500);
      }
    },
  },
  {
    name: 'results-by-division.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Results|Výsledky/);
      await waitForContent(page, 'By Division|Podľa divízie', 12000);
    },
  },
  {
    name: 'results-by-stage.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Results|Výsledky/);
      await waitForContent(page, 'By Division|Podľa divízie');
      const sub = page.getByRole('button', { name: /By Stage|Podľa etapy/i }).first();
      if (await sub.count()) await sub.click();
      await page.waitForTimeout(800);
    },
  },
  {
    name: 'results-dq-table.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Results|Výsledky/);
      await waitForContent(page, 'By Division|Podľa divízie');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'export-buttons.png',
    viewport: DESKTOP,
    setup: async (page) => {
      await clickTab(page, /Results|Výsledky/);
      await waitForContent(page, 'By Division|Podľa divízie');
    },
  },
  // Mobile — scorer-style
  {
    name: 'scoring-mobile-ipsc.png',
    viewport: MOBILE,
    setup: async (page) => {
      await clickTab(page, /Sco|Zad/);
      await waitForContent(page, 'Stage 1', 12000);
      await pickShooter(page, 'John Smith');
    },
  },
  {
    name: 'scoring-mobile-summary.png',
    viewport: MOBILE,
    setup: async (page) => {
      await clickTab(page, /Sco|Zad/);
      await waitForContent(page, 'Stage 1');
      await pickShooter(page, 'John Smith');
    },
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    let ok = 0;
    let failed = 0;
    for (const s of SHOTS) {
      const context = await browser.newContext({ viewport: s.viewport });
      const page = await context.newPage();
      // Per-page 60s timeout for any one setup
      page.setDefaultTimeout(15000);
      console.log(`→ ${s.name} @ ${s.viewport.width}x${s.viewport.height}`);
      try {
        await login(page);
        await s.setup(page);
        await shot(page, s.name);
        ok++;
      } catch (err) {
        console.error(`  ✗ ${s.name} FAILED:`, err instanceof Error ? err.message : err);
        failed++;
      } finally {
        await context.close().catch(() => {});
      }
    }
    console.log(`\n${ok} ok, ${failed} failed`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
