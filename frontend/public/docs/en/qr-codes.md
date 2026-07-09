# QR codes & sharing

When the app is running with a reachable network URL, the admin header shows a **LAN URL badge** with links to three QR code screens. These let spectators and scorers access the app from their own devices without typing URLs.

## LAN URL badge

The badge shows the app's network address (e.g. `192.168.1.5:3001`). Click it to copy the URL to your clipboard — paste it into a phone browser on the same Wi-Fi to open the app.

The three buttons next to it generate dedicated QR codes:

## 🏆 Results QR

![Results QR modal](/docs/screenshots/qr-modal.png)

QR code for the **public results** page at `/results`. Anyone who scans it sees a read-only view of the current match's results, accessible from any device on the same network.

Use **Print** or **Download PDF** from the QR modal to create an A4 poster for the range.

## 🎯 Scorer Access QR

QR code for the **scorer / range master scoring** page at `/scoring`. Scanning the QR opens browser and automatically redeems a **trust token**, giving one‑tap access to scoring without a password.

The Scorer Trust modal shows:

- **QR code** — the current trust URL that scorers scan
- **URL** — the full link (with `?trustToken=...`) — tap the copy button to share it via messaging
- **Active Sessions** — a list of currently connected scorer devices and their last activity time
- **Rotate Token** — generates a new trust token, invalidating all existing scorer sessions. Use this if a session is compromised or at the end of a match day

### How scorers log in

1. The range master shows the QR code on their device.
2. The scorer opens their phone camera and scans the QR.
3. Browser opens the link and the token is automatically redeemed — the scorer lands on the scoring page.
4. If the scorer is using the PWA (installed to home screen), they tap **Or paste link** and paste the full URL copied from the browser.

## 📋 Squads QR

QR code for the **public squads** page at `/squads`. Shows a read-only list of squad assignments as set by the admin. Useful for posting on the range notice board.
