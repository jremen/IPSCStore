# QR kódy a zdieľanie

Keď aplikácia beží s dosiahnuteľnou doménou (napr. `squads.local` alebo sieťová URL), admin hlavička zobrazuje **LAN URL badge** s odkazmi na tri obrazovky QR kódov. Diváci a hodnotitelia tak môžu pristupovať k aplikácii z vlastných zariadení bez písania URL adries.

## LAN URL badge

Badge zobrazuje sieťovú adresu aplikácie (napr. `192.168.1.5:5173`). Kliknutím skopírujete URL do schránky — vložte ju do prehliadača v telefóne v rovnakej Wi-Fi sieti pre otvorenie aplikácie.

Tri tlačidlá vedľa neho generujú špecializované QR kódy:

## 🏆 QR pre výsledky

![QR modal výsledkov](/docs/screenshots/qr-modal.png)

QR kód pre **verejné výsledky** na `/vysledky`. Každý, kto ho naskenuje, uvidí výsledky aktuálnej súťaže na svojom zariadení v rovnakej sieti.

Použite **Vytlačiť** alebo **Stiahnuť PDF** z QR modalu na vytvorenie A4 plagátu pre strelnicu.

## 🎯 QR pre hodnotiteľov

QR kód pre **bodovanie rozhodcov** na `/hodnotenie`. Naskenovaním QR sa otvorí prehliadač a automaticky aktivuje **trust token**, čo umožní jednoklíkové prihlásenie bez hesla.

Modal prístupu hodnotiteľa zobrazuje:

- **QR kód** — aktuálna trust URL, ktorú hodnotitelia skenujú
- **URL** — celý odkaz (s `?trustToken=...`) — tlačidlo kopírovania pre zdieľanie cez správy
- **Aktívne relácie** — zoznam aktuálne pripojených zariadení hodnotiteľov a čas ich poslednej aktivity
- **Rotovať token** — vygeneruje nový trust token, čím zneplatní všetky existujúce relácie hodnotiteľov. Použite ak je relácia kompromitovaná alebo na konci dňa

### Ako sa hodnotitelia prihlasujú

1. Rozhodca zobrazí QR kód na svojom zariadení.
2. Hodnotiteľ otvorí fotoaparát a naskenuje QR.
3. Prehliadač otvorí odkaz a token sa automaticky aktivuje — hodnotiteľ sa dostane na stránku bodovania.
4. Ak hodnotiteľ používa PWA (aplikáciu nainštalovanú na ploche), klepne na **Alebo vložte odkaz** a vloží celú URL skopírovanú z prehliadača.

## 📋 QR pre squady

QR kód pre **verejné zobrazenie squad-ov** na `/squads`. Zobrazuje zoznam rozdelenia do squad-ov podľa nastavenia admina. Užitočné pre vyvesenie na nástenke strelnice.
