# Audit log

Audit log zaznamenáva každú administratívnu a bodovaciu akciu vykonanú v aplikácii. Použite ho na sledovanie, kto zmenil skóre, vytvoril alebo vymazal záznamy, exportoval dáta alebo vykonal iné citlivé operácie.

## Otvorenie audit logu

V admin hlavičke kliknite na tlačidlo **⚙️ Nastavenia**. V modale Nastavenia kliknite na **Zobraziť audit log** v sekcii „Audit log".

![Audit log modal](/docs/screenshots/audit-log-modal.png)

## Čo audit log zobrazuje

Každý záznam obsahuje:

- **Čas** — kedy sa akcia uskutočnila
- **Aktér** — kto ju vykonal (`admin`, `scorer` alebo `anonymous`)
- **Akcia** — čo sa urobilo (napr. `score.write`, `shooter.create`, `match.delete`)
- **Cieľ** — ktorá tabuľka a riadok boli ovplyvnené (napr. `registrations:uuid`, `stages:uuid`)
- **IP** — IP adresa aktéra
- **Detaily** — voliteľné metadata (kliknite pre rozbalenie)

## Filtrovanie

- **Filter akcie** — zadajte podreťazec na filtrovanie podľa názvu akcie (napr. `score` zobrazí všetky bodovacie záznamy)
- **Filter role** – vyberte rolu na zobrazenie akcií iba toho aktéra
- Kliknite na **Filtrovať** alebo stlačte Enter pre použitie; kliknite na **↻** pre obnovenie od prvej strany

## Stránkovanie

Log sa načítava po 100 záznamoch. Kliknite na **Načítať ďalšie** v spodnej časti pre načítanie starších záznamov.

## Typické akcie

| Akcia | Popis |
|---|---|
| `score.write` | Skóre bolo uložené alebo aktualizované |
| `score.recalculate-stage` | Skóre pre situáciu bolo prepočítané |
| `score.recalculate-match` | Všetky skóre pre súťaž bolo prepočítané |
| `match.create` / `match.delete` | Súťaž bola vytvorená alebo vymazaná |
| `shooter.create` / `shooter.update` / `shooter.delete` | Strelec bol vytvorený, aktualizovaný alebo mazaný |
| `registration.create` / `registration.delete` | Strelec bol zaregistrovaný alebo odregistrovaný |
| `registration.dq` / `registration.undq` | Strelec bol diskvalifikovaný alebo vrátený |
| `import.shooters` / `import.scores` | Boli importované dáta |
| `backup.export` / `backup.restore` | Záloha databázy bola exportovaná alebo obnovená |
| `match.export` | Súťaž bola exportovaná do iného formátu |
