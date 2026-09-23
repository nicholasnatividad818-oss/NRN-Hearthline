# NRN Hearthline

Offline-first family continuity app.

Household ledger, medications, check-ins, emergency pack, and a named-neighbor block. Data lives in the browser (`localStorage`). Export and import JSON to move a household between devices.

## Run

**Easiest:** open `Hearthline.html` in a browser. One file. No server.

**PWA / offline cache:** serve this folder over HTTP:

```bash
python3 -m http.server 8765
```

Then visit `http://localhost:8765`.

## What this MVP is not

Not an EHR. Not a clinician. Not a mesh radio. Not a marketplace.

NRN · Instinct Ink Identity
