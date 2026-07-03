# Bodovanie v mobile

Na telefóne sa bodovanie zbalí do jedného stĺpca. Strelec prechádza papierovými terčami, potom oceľou, potom časom a nakoniec uloží.

![Hárok zadávania v mobile](/docs/screenshots/scoring-mobile-ipsc.png)

## Rozloženie

- **Horná lišta** — aktívna situácia ako tlačidlo (kliknutím prepnete situácie cez modal), ikona briefingu.
- **Zoznam strelcov** — kliknutím na meno strelca začnete zadávať. Zoznam je na celú obrazovku.
- **Hárok** — papierové terče zoradené vertikálne (jeden na riadok), potom oceľové terče v riadku, potom NPM/no-shoot (ak je to relevantné), potom procedurálne, potom čas naspodku.
- **Tlačidlo DQ** — úplne naspodku.
- **Uložiť** — veľké tlačidlo naspodku, sticky.

## Prepínanie situácií

Výber situácie je modal otvorený z hlavičky. Zobrazuje všetky situácie aktuálnej súťaže so zaškrtnutím pri hodnotených strelcoch.

## Offline režim

Ak sieť vypadne, skóre sa zaradia do fronty v IndexedDB a synchronizujú sa hneď, ako bude zariadenie opäť online. Platí rovnaká ochrana pred konfliktom ako na počítači: ak hostiteľ už má iné skóre, lokálna kópia sa zahodí a načíta sa verzia hostiteľa.

V hlavičke sa zobrazí malý offline indikátor s počtom čakajúcich uložení.

## Súhrnné zobrazenie (vzdialení zadávači)

Po zadaní všetkých polí vidia mobilní zadávači súhrnnú kartu so vstupmi a vypočítaným skóre. Ťuknutím na **Potvrdiť** odošlú. Hostiteľ súťaže potom schváli alebo zamietne.

![Súhrnné zobrazenie v mobile](/docs/screenshots/scoring-mobile-summary.png)

**Vykonať v aplikácii:** [Prejsť na bodovanie](app-tab:scoring)
