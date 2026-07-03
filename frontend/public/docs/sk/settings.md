# Nastavenia

![Modal nastavení](/docs/screenshots/settings-modal.png)

Modal Nastavenia (ikona ⚙️ v hlavičke, iba pre administrátora) umožňuje konfigurovať jazyk, vzhľad a admin heslo aplikácie.

## Jazyk

Vyberte **English** (angličtina) alebo **Slovenčina**. Prepnutie sa prejaví okamžite — celé rozhranie aplikácie je preložené.

## Téma

K dispozícii sú tri témy:

- **Svetlá** — svetlé pozadie s tmavým textom, predvolená
- **Tmavá** — tmavé pozadie so svetlým textom, vhodná pri slabom osvetlení
- **Vysoký kontrast** — čisto čierna na bielom, navrhnuté pre e-ink displeje a čitateľnosť vonku

## Admin heslo

Predvolené admin heslo je `admin`. Pre zmenu:

1. Zadajte **aktuálne heslo**.
2. Zadajte **nové heslo** (aspoň 10 znakov).
3. **Potvrďte** nové heslo.

Heslo je hashované a uložené na serveri. Zmena hesla neovplyvní už prihlásené admin relácie — týka sa iba budúcich prihlásení.

## Audit log

Sekcia **Audit log** v spodnej časti modalu Nastavenia vám umožní zobraziť každú administratívnu a bodovaciu akciu zaznamenanú aplikáciou. Kliknite na **Zobraziť audit log** pre otvorenie. Viac detailov o filtrovaní, stránkovaní a zozname sledovaných akcií nájdete v [Audit log](audit.md).
