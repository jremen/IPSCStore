# Squadding & groups

A squad is a numbered group of shooters that run a stage together. A group is a "car pool" — shooters who want to be in the same squad.

## Groups (car pools)

In the Registration tab, drag a shooter row onto another row to add them to a group. Groups are colored on the right edge of the row.

Groups don't assign a squad number by themselves; they only tag shooters as wanting to be together. Use the squadding modal to assign them to a squad.

## Squads

Open the **Squadding** modal from the Registration tab.

![Squadding modal](/docs/screenshots/squadding-modal.png)

### The modal shows

- **Unassigned** column on the left, with a search box.
- **N squad columns** to the right, with shooters and an "Add Shooter" button.
- **+ Add Squad** at the end to create a new squad.
- **Generate PDF** at the top to print the squadding list for the range.

### Moving shooters

- **Drag a shooter card** from one column to another to assign or reassign them.
- **Click + Add Shooter** in a column to pick from the unassigned list.
- The "+ Add Squad" button creates a new empty column.

The changes are flushed when you close the modal, with offline support for unreliable connections.

### Public squads view

Anyone on the local network can open a read-only squads view at `/squads` (e.g. `http://192.168.1.5:3001/squads`). It auto-refreshes every 30 seconds.

**To do this in the app:** [Go to Registration](app-tab:registration)
