import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

const CERT_DIR = 'certs';
const CERT_FILE = 'server.crt';
const KEY_FILE = 'server.key';
const MIN_VALIDITY_DAYS = 30;
const VALIDITY_DAYS = 365;

/**
 * Generate a self-signed TLS certificate for LAN usage.
 * Returns paths to the cert and key files.
 */
export function ensureTlsCert(userDataPath: string, lanIp: string): { certPath: string; keyPath: string } {
  const certsDir = path.join(userDataPath, CERT_DIR);
  const certPath = path.join(certsDir, CERT_FILE);
  const keyPath = path.join(certsDir, KEY_FILE);

  // If cert exists and is still valid for > MIN_VALIDITY_DAYS, reuse it
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
      const certPem = fs.readFileSync(certPath, 'utf8');
      const cert = forge.pki.certificateFromPem(certPem);
      const notAfter = cert.validity.notAfter;
      const daysRemaining = (notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysRemaining > MIN_VALIDITY_DAYS) {
        return { certPath, keyPath };
      }
    } catch {
      // Corrupted cert — regenerate
    }
  }

  return generateCert(certsDir, certPath, keyPath, lanIp);
}

function generateCert(certsDir: string, certPath: string, keyPath: string, lanIp: string): { certPath: string; keyPath: string } {
  // Ensure directory exists
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  // Generate RSA key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const privateKey = forge.pki.privateKeyToPem(keys.privateKey);

  // Create X.509 certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';

  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(now.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const attrs = [
    { name: 'commonName', value: 'IPSCScore' },
    { name: 'organizationName', value: 'IPSCScore' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Subject Alternative Names — critical for modern browsers
  const sanList = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
  ];

  // Add the actual LAN IP if provided and not a loopback
  if (lanIp && !lanIp.startsWith('127.') && !lanIp.startsWith('0.')) {
    sanList.push({ type: 7, ip: lanIp });
  }

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      keyEncipherment: true,
      digitalSignature: true,
    },
    {
      name: 'subjectAltName',
      altNames: sanList,
    },
  ]);

  // Self-sign
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Write files
  const certPem = forge.pki.certificateToPem(cert);
  fs.writeFileSync(certPath, certPem, 'utf8');
  fs.writeFileSync(keyPath, privateKey, 'utf8');

  console.log(`[TLS] Generated self-signed certificate (valid ${VALIDITY_DAYS} days)`);
  console.log(`[TLS] Cert: ${certPath}`);
  console.log(`[TLS] Key:  ${keyPath}`);

  return { certPath, keyPath };
}
