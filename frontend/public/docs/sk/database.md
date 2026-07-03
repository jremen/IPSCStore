# Databáza a zálohy

![Modal nastavení s panelom Databáza](/docs/screenshots/settings-modal.png)

Panel Databáza v Nastaveniach umožňuje exportovať, importovať a automaticky zálohovať vaše dáta.

## Manuálny export / import (.sql)

- **Export** — stiahne kompletný `.sql` súbor vašej databázy. Použite ho ako snímku na prenos medzi zariadeniami alebo ako záložnú kópiu.
- **Import** — nahradí **všetky** existujúce dáta obsahom `.sql` súboru. Potvrdzovací dialóg varuje, že túto akciu nie je možné vrátiť.

Obe akcie sú dostupné z **Nastavenia → Databáza**.

## Import WinMSS

Ak máte existujúci `.mdb` súbor z WinMSS, použite tlačidlo **Import WinMSS** v Nastavenia → Databáza na import starších súťažných dát (súťaže, strelci, registrácie, skóre).

## Lokálna automatická záloha (iba Electron desktop aplikácia)

Pre priebežnú ochranu nastavte **priečinok záloh** v **Nastavenia → Databáza → Automatická záloha**.

1. **Vyberte priečinok** — zvoľte ľubovoľný lokálny priečinok synchronizovaný s iCloud, Google Drive, OneDrive, Dropbox, USB diskom alebo NAS.
2. **Povoľte automatické zálohovanie** — aplikácia zapíše plnú zálohu každú noc a priebežné delta zmeny počas dňa.
3. **Sledujte stav** — panel zobrazuje čas poslednej plnej zálohy, počet čakajúcich delta zmien a celkovú veľkosť na disku.
4. **Zálohovať teraz** — okamžite spustí plnú zálohu.
5. **Obnoviť z priečinka** — vyberte priečinok záloh a obnovte celú dátovú stopu (full + delta). Toto nahradí všetky dáta a znova načíta aplikáciu.

Priečinok záloh musí byť dostupný, aby automatický režim fungoval. Ak je disk odpojený, aplikácia pozastaví zálohovanie a panel zobrazí upozornenie.
