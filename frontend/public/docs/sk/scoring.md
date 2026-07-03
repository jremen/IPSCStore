# Bodovanie

Bodovanie znamená vloženie zásahov a času strelca pre danú situáciu. Pre každý typ bodovania sa zobrazí iný vstupný hárok, ale životný cyklus je rovnaký.

## Životný cyklus

1. **Vyberte situáciu** — tlačidlo v hlavičke (mobil) alebo pásik kariet (počítač).
2. **Vyberte strelca** — zoznam strelcov vľavo, alebo tlačidlá **Ďalej** / **Späť** v hlavičke.
3. **Zadajte zásahy** — papier / oceľ / no-shoot / NPM podľa typu bodovania.
4. **Zadajte čas** — v spodnej časti hárku (alebo navrchu, na mobile).
5. **Potvrďte a uložte** — administrátori ukladajú priamo. Vzdialení zadávači najprv uvidia súhrnné zobrazenie na kontrolu.

Zelené zaškrtnutie vedľa strelca znamená, že je pre aktívnu situáciu hodnotený.

## Ochrana pred konfliktom

Ak má strelec už zadané skóre a pokúsite sa uložiť nové skóre pre rovnakú (situáciu, strelca) ako ne-administrátor, server odmietne uloženie s chybou **409 Conflict** a pôvodné skóre hostiteľa zostane zachované. Offline synchronizačný manažér zahodí svoju zastaranú lokálnu kópiu a obnoví dáta zo servera.

Administrátori nie sú blokovaní — môžu skóre znova uložiť pre opravu chyby. Zmena sa zaznamená v audit logu.

## Počítač vs. mobil

Bodovanie je responzívne. Rovnaká komponenta zobrazuje dve rozloženia:

- **Počítač (≥ 1024px)**: papierové terče v dvoch stĺpcoch vľavo, oceľové terče + procedurálne v bočnom paneli vpravo, čas naspodku. Výber situácie je horizontálny pásik.
- **Mobil**: jeden stĺpec — najprv papierové terče, potom oceľ, potom procedurálne, potom čas. Výber situácie je modal otvorený z hlavičky.

Pozrite si špecializované stránky pre snímky obrazovky: [Bodovanie na počítači](app-tab:scoring) a [Bodovanie v mobile](app-tab:scoring).
