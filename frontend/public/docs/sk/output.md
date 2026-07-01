# Výstupy a exporty

Aplikácia dokáže exportovať výsledky v niekoľkých formátoch. Otvorte záložku **Výsledky** a použite tlačidlá exportu v hlavičke.

![Tlačidlá exportu](/docs/screenshots/export-buttons.png)

## CSV

- **CSV výsledkov** — všetci strelci s ich celkovým percentuálnym podielom, divíziou a kategóriou.
- **CSV registrácií** — zo záložky Preteky, exportuje zoznam registrácií pre preteky.
- **CSV strelcov** — zo záložky Strelci, exportuje globálnu databázu strelcov.

CSV súbory sa otvárajú v Exceli, Numbers alebo akejkoľvek tabuľkovej aplikácii.

## PDF

- **Hárky skóre** — zo záložky Etapy, hárky skóre pre každú etapu pripravené na tlač.
- **Zoznam družstiev** — z modalu družstiev, pridelenie družstiev pre potreby strelnice.
- **Výsledky** — formátované PDF výsledkov, pripravené na tlač a vyvesenie na strelnici.

## JSON

- **Export pretekov** — zo záložky Preteky, jeden JSON súbor s celými pretekmi (etapy, registrácie, skóre, výsledky). Užitočné na zdieľanie nastavenia pretekov s iným zariadením.
- **Import pretekov** — opak: nahradí lokálne preteky obsahom JSON súboru.

## Import WinMSS

Ak máte existujúcu databázu WinMSS, môžete importovať `.mdb` súbor z **Nastavenia → Databáza**. Preteky, strelci, registrácie a skóre sa importujú.

## Zálohovanie databázy

Pre priebežnú ochranu nastavte **lokálny priečinok záloh** v Nastaveniach. Aplikácia zapisuje plnú zálohu každú noc a delta zmeny počas dňa, takže môžete obnoviť celú databázu z ľubovoľného priečinka synchronizovaného s iCloud, Google Drive, OneDrive, Dropbox alebo USB disk.

**Vykonať v aplikácii:** [Exportovať výsledky ako PDF](app-action:export-results-pdf)
