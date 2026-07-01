# Etapy a situácie

Etapa (nazývaná aj „situácia" alebo „course of fire") je jedno samostatne hodnotené cvičenie. Každá etapa má typ bodovania, počet terčov a voliteľný popis a obrázok.

## Vytvorenie etapy

Otvorte záložku **Etapy** pre aktuálne preteky a kliknite na **+ Pridať etapu**.

![Formulár etapy](/docs/screenshots/stage-form-modal.png)

Etapa obsahuje:

- **Názov** — Používa sa všade, kde sa etapa zobrazuje.
- **Typ bodovania** — Pozri [Typy bodovania](#typy-bodovania) nižšie.
- **Terče** — Počet papierových, oceľových, no-shoot a NPM terčov.
- **Zásahy na papier** — Koľko zásahov sa registruje na každý papierový terč.
- **Par time** — Iba pre `Fixed Time`.
- **Konfigurácia** — Polia špecifické pre daný typ (počet strín, typ kurzu, typ streľby atď.).
- **Briefing** — Voľný text s popisom etapy, zobrazuje sa zadávačom.

Obrázok etapy (schéma priebehu) môžete nahrať samostatne zo zoznamu etáp.

**Vykonať v aplikácii:** [Vytvoriť novú etapu](app-action:new-stage)

## Typy bodovania

Aplikácia podporuje 13 typov bodovania. Niektoré zdieľajú rovnaké rozloženie (papier/oceľ/procedurálne), iné majú úplne iný vstupný tvar.

| Skupina | Typ bodovania | Použitie |
|---|---|---|
| IPSC | Comstock, Virginia Count, Fixed Time, Chrono | Čas + zásahy + najlepší z |
| Všeobecné | Hit Factor | Čas + zásahy, radené podľa HF |
| IDPA | IDPA (Vickers Count) | Down-zone body + časovo-aditívne penalizácie |
| Oceľ | Action Steel | Struny oceľových terčov, drop worst |
| Multi-Gun | Multi-Gun | Čas + neutralizácia jednotlivých terčov |
| Presnosť | Long Range (F-Class, PRS), Bullseye | Kruhy alebo hit/miss na terč |
| Lukostreľba | Archery | Kruhy, X sa počíta ako 10 |
| Rimfire | NRL22 | Hit/miss na terč, nastaviteľné body |
| ISSF | ISSF | Kruhy, typ kurzu určuje počet výstrelov |

### Comstock / Virginia / Fixed Time / Hit Factor / Chrono

- Papierové terče: zadajte zásahy ako **Alpha / Charlie / Delta / Miss** pre každý terč.
- Oceľové terče: zadajte **Hit / Miss** pre každý terč.
- No-shoot terče: počet zásahov sa počíta ako penalizácia.
- Čas: povinný pre Comstock, Virginia, Hit Factor, IDPA, Multi-Gun.
- Procedurálne a FTSA penalizácie sú bežné.
- Virginia Count pridáva penalizácie za extra výstrel, extra zásah a stacking.

Pozrite si stránky [Zadávanie na počítači](app-tab:scoring) a [Zadávanie v mobile](app-tab:scoring) pre snímky obrazovky.

### IDPA

- Vickers Count: down-zone body namiesto up-zone. A=0, C=−1, D=−3, Miss=−5.
- Čas je povinný.
- Päť penalizačných stepperov (PE, HNT, FTN, FP, FTDR) pripočítava sekundy k času.

### Action Steel

- Časové vstupy pre každú strunu (predvolene 5 strún).
- Hit tap pre každý tanier.
- Nastaviteľné: drop worst, penalizácia za miss, miss cap pre stop-plate.

### Multi-Gun

- Jeden čas.
- Prepínač neutralizácie pre každý terč.
- Penalizačné sekundy (FTN, miss, no-shoot, procedurálne) sa pripočítavajú k času.

### Bullseye / ISSF / Archery

- Skóre v kruhoch pre každý výstrel.
- Typ kurzu určuje počet výstrelov.

### NRL22 / Long Range (PRS)

- Hit tap pre každý terč.
- Nastaviteľné body za zásah.

## PDF hárok skóre

V zozname etáp kliknite na ikonu tlače a vygenerujte PDF hárok skóre pre potreby rozhodcu na palebnej čiare.

**Prejsť v aplikácii:** [Záložka Etapy](app-tab:stages)
