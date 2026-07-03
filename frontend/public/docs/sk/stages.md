# Situácie

Situácia (nazývaná aj „course of fire") je jedno samostatne hodnotené cvičenie. Každá situácia má typ bodovania, počet terčov a voliteľný popis a obrázok.

## Vytvorenie situácie

Otvorte záložku **Situácie** pre aktuálnu súťaž a kliknite na **+ Pridať situáciu**.

![Formulár situácie](/docs/screenshots/stage-form-modal.png)

### Situácia obsahuje

- **Názov** — Používa sa všade, kde sa situácia zobrazuje.
- **Typ bodovania** — Pozri [Typy bodovania](#typy-bodovania) nižšie.
- **Terče** — Počet papierových, oceľových, no-shoot a NPM terčov.
- **Zásahy na papier** — Koľko zásahov sa registruje na každý papierový terč.
- **Par time** — Iba pre `Fixed Time`.
- **Konfigurácia** — Polia špecifické pre daný typ (počet kôl, typ kurzu, typ streľby atď.).
- **Briefing** — Voľný text s popisom situácie, zobrazuje sa zadávačom.

Obrázok situácie (schéma priebehu) môžete nahrať samostatne zo zoznamu situácií.

**Vykonať v aplikácii:** [Vytvoriť novú situáciu](app-action:new-stage)

## Typy bodovania

Aplikácia podporuje 13 typov bodovania. Niektoré zdieľajú rovnaké rozloženie (papier/oceľ/procedurálne), iné majú úplne iný vstupný tvar.

| Skupina | Typ bodovania | Použitie |
|---|---|---|
| IPSC | Comstock, Virginia Count, Fixed Time, Chrono | Čas + zásahy + najlepší z |
| Všeobecné | Hit Factor | Čas + zásahy, radené podľa HF |
| IDPA | IDPA (Vickers Count) | Down-zone body + časovo-aditívne penalizácie |
| Oceľ | Action Steel | Streľba oceľových terčov v kolách |
| Multi-Gun | Multi-Gun | Čas + neutralizácia jednotlivých terčov |
| Presnosť | Long Range (F-Class, PRS), Bullseye | Kruhy alebo hit/miss na terč |
| Lukostreľba | Archery | Medzinárodné kruhy, X sa počíta ako 10 |
| Rimfire | NRL22 | Hit/miss na terč, nastaviteľné body |
| ISSF Malorážka | ISSF | Medzinárodné kruhy, typ kurzu určuje počet výstrelov |

### Comstock / Virginia / Fixed Time / Hit Factor / Chrono

- Papierové terče: zadajte zásahy ako **Alpha / Charlie / Delta / Miss** pre každý terč.
- Oceľové terče: zadajte **Hit / Miss** pre každý terč.
- No-shoot terče: počet zásahov sa počíta ako penalizácia.
- Čas: povinný pre Comstock, Virginia, Hit Factor, IDPA, Multi-Gun.
- Procedurálne a FTSA penalizácie sú bežné.
- Virginia Count pridáva penalizácie za extra výstrel, extra zásah a stacking.

Pozrite si stránky [Bodovanie na počítači](app-tab:scoring) a [Bodovanie v mobile](app-tab:scoring) pre snímky obrazovky.

### IDPA

- Vickers Count: down-zone body namiesto up-zone. A=0, C=−1, D=−3, Miss=−5.
- Čas je povinný.
- Päť penalizačných stepperov (PE, HNT, FTN, FP, FTDR) pripočítava sekundy k času.

### Action Steel

- Časové vstupy pre každé kolo (predvolene 5 kôl).
- Hit tap pre každý tanier.
- Nastaviteľné: vypustiť najhoršie kolo, penalizácia za miss, miss cap pre stop-plate.

### Multi-Gun

- Jeden čas.
- Prepínač neutralizácie pre každý terč.
- Penalizačné sekundy (FTN, miss, no-shoot, procedurálne) sa pripočítavajú k času.

### Bullseye / ISSF / Lukostreľba

- Skóre v kruhoch pre každý výstrel.
- Typ kurzu určuje počet výstrelov.

### NRL22 / Ďalekonosná puška (PRS)

- Hit tap pre každý terč.
- Nastaviteľné body za zásah.

## PDF bodovací hárok

V zozname situácií kliknite na ikonu tlače a vygenerujte PDF bodovací hárok pre potreby rozhodcu na palebnej čiare.

**Prejsť v aplikácii:** [Záložka Situácie](app-tab:stages)
