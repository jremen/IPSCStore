# Stages & situations

A stage (also called a "situation" or "course of fire") is a single scored exercise. Each stage has a scoring type, a number of targets, and optional briefing/image.

## Creating a stage

Open the **Stages** tab for the current match and click **+ Add Stage**.

![Add stage form](/docs/screenshots/stage-form-modal.png)

### A stage has

- **Name** — Used everywhere the stage is listed.
- **Scoring type** — See [Types of scoring](#types-of-scoring) below.
- **Targets** — Number of paper, steel, no-shoot, and NPM targets.
- **Hits per paper** — How many hits register on each paper target.
- **Par time** — For `Fixed Time` only.
- **Config** — Per-type fields (number of strings, course type, fire type, etc.).
- **Briefing** — Free-text stage briefing shown to scorers.

You can also upload a stage image (the walkthrough diagram) from the stage list.

**To do this in the app:** [Create a new stage](app-action:new-stage)

## Types of scoring

The app supports 13 scoring types. Some share a layout (paper/steel/procedurals), others have a completely different input shape.

| Group | Scoring type | Used for |
|---|---|---|
| IPSC | Comstock, Virginia Count, Fixed Time, Chrono | Time + hits + best-of |
| General | Hit Factor | Time + hits, ranked by HF |
| IDPA | IDPA (Vickers Count) | Down-zone points + time-additive penalties |
| Steel | Action Steel | Strings of steel, drop worst |
| Multi-Gun | Multi-Gun | Time + per-target neutralized |
| Precision | Long Range (F-Class, PRS), Bullseye | Rings, or per-target hit tap |
| Archery | Archery | Rings, X counted as 10 |
| Rimfire | NRL22 | Per-target hit tap, configurable points |
| ISSF | ISSF | Rings, course type drives shot count |

### Comstock / Virginia / Fixed Time / Hit Factor / Chrono

- Paper targets: enter hits as **Alpha / Charlie / Delta / Miss** per target.
- Steel targets: enter **Hit / Miss** per plate.
- No-shoot targets: enter hit count, applied as a penalty.
- Time: required for Comstock, Virginia, Hit Factor, IDPA, Multi-Gun.
- Procedural and FTSA penalties are common.
- Virginia Count adds extra-shot, extra-hit, and stacking penalties.

See the [Scoring on desktop](app-tab:scoring) and [Scoring on mobile](app-tab:scoring) pages for screenshots.

### IDPA

- Vickers Count: zone-down points instead of zone-up. A=0, C=−1, D=−3, Miss=−5.
- Time is required.
- Five penalty steppers (PE, HNT, FTN, FP, FTDR) add seconds to the time.

### Action Steel

- Per-string time inputs (default 5 strings).
- Per-plate hit tap.
- Configurable: drop worst, miss penalty, stop-plate miss cap.

### Multi-Gun

- Single time.
- Per-target neutralized toggle.
- Penalty seconds (FTN, miss, no-shoot, procedural) added to the time.

### Bullseye / ISSF / Archery

- Ring score per shot.
- Course type drives the number of shots.

### NRL22 / Long Range (PRS)

- Per-target hit tap.
- Configurable points per hit.

## Score sheet PDF

From the stage list, click the print icon to generate a PDF score sheet for use by the range officer.

**To do this in the app:** [Go to Stages](app-tab:stages)
