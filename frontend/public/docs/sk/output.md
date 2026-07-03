# Výstupy a exporty

Aplikácia dokáže exportovať výsledky v niekoľkých formátoch. Otvorte záložku **Výsledky** a použite tlačidlá exportu v hlavičke.

![Tlačidlá exportu](/docs/screenshots/export-buttons.png)

## CSV

- **CSV výsledkov** — všetci strelci s ich celkovým percentuálnym podielom, divíziou a kategóriou.
- **CSV registrácií** — zo záložky Súťaže, exportuje zoznam registrácií pre súťaž.
- **CSV strelcov** — zo záložky Strelci, exportuje globálnu databázu strelcov.

CSV súbory sa otvárajú v Exceli, Numbers alebo akejkoľvek tabuľkovej aplikácii.

## PDF

- **Bodovacie hárky** — zo záložky Situácie, bodovacie hárky pre každú situáciu pripravené na tlač.
- **Zoznam squad-ov** — z modalu squadding, pridelenie squad-ov pre potreby strelnice.
- **Výsledky** — formátované PDF výsledkov, pripravené na tlač a vyvesenie na strelnici.

## JSON

- **Export súťaže** — zo záložky Súťaže, jeden JSON súbor s celou súťažou (situácie, registrácie, skóre, výsledky). Užitočné na zdieľanie nastavenia súťaže s iným zariadením.
- **Import súťaže** — opak: nahradí lokálnu súťaž obsahom JSON súboru.

## Import WinMSS

Ak máte existujúcu databázu WinMSS, môžete importovať `.mdb` súbor z **Nastavenia → Databáza**. Súťaže, strelci, registrácie a skóre sa importujú.

## Zálohovanie databázy

Pre priebežnú ochranu nastavte **lokálny priečinok záloh** v Nastaveniach. Aplikácia zapisuje plnú zálohu každú noc a delta zmeny počas dňa, takže môžete obnoviť celú databázu z ľubovoľného priečinka synchronizovaného s iCloud, Google Drive, OneDrive, Dropbox alebo USB disk.

**Vykonať v aplikácii:** [Exportovať výsledky ako PDF](app-action:export-results-pdf)
