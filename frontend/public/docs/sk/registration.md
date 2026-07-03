# Registrácia a strelci

Strelec je osoba v globálnej databáze. Registrácia je prepojenie medzi strelcom a konkrétnou súťažou, s voliteľnými prepísaniami divízie/kategórie/power factor.

## Globálna databáza strelcov

Záložka **Strelci** je globálny fond. Môžete:

- Pridať strelca manuálne
- Hromadne importovať CSV
- Upraviť, soft-delitovať alebo obnoviť ľubovoľného strelca
- Vyhľadávať podľa mena, divízie, regiónu alebo štítku

![Databáza strelcov](/docs/screenshots/registration-list.png)

**Vykonať v aplikácii:** [Pridať nového strelca](app-action:new-shooter)

## Registrovanie strelcov do súťaží

Otvorte záložku **Registrácia** pre aktuálnu súťaž.

- **Pridať existujúceho strelca** — vyhľadajte v globálnej databáze, kliknutím pridajte.
- **Vytvoriť + registrovať inline** — vytvorte nového strelca a pridajte ho v jednom kroku.
- **Upraviť registráciu** — prepíšte divíziu, kategóriu alebo power factor len pre túto súťaž.
- **Hromadná úprava / odstránenie** — označte riadky checkboxmi, potom akciu.
- **Drag-to-group** — potiahnite riadok na iný riadok, aby ste ich dali do rovnakej skupiny. Užitočné, aby priatelia boli v rovnakom squade.

![Úprava registrácie](/docs/screenshots/edit-registration-modal.png)

**Prejsť v aplikácii:** [Záložka Registrácia](app-tab:registration)

## Divízie a kategórie

- **Divízia** je trieda zbrane (napr. Production, Standard, Open pre IPSC). Divízie sú ohraničené organizáciou súťaže a typom zbrane.
- **Kategória** je trieda osoby (Regular, Junior, Senior, Super Senior, Lady).
- **Power factor** je Minor alebo Major — ovplyvňuje, ako sa zásahy bodujú (IPSC).

Každá registrácia dedí predvolené hodnoty strelca; môžete ich prepísať pre konkrétnu súťaž cez modal Úprava registrácie.

**Vykonať v aplikácii:** [Pridať registráciu](app-action:add-registration)
