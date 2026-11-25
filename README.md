# Flow

Local, offline PDF speed reader (RSVP). React + TypeScript + Vite + bundled PDF.js. No backend, accounts, APIs or CDNs.

## Run

```
npm install
npm run dev        # development
npm run build      # outputs dist/ (also injects the service-worker precache list)
npm run preview    # serve dist/ locally
```

Deploy the contents of `dist/` to any static host over HTTPS (service workers need HTTPS or localhost). Open it once online; after that it works offline and can be installed from the browser menu.

## Notes

- Documents and extracted text live in IndexedDB; settings in localStorage. Reading position and per-document speed save automatically.
- Uses the PDF.js "legacy" build so older Android browsers work. PDF.js and its worker are bundled locally.
- Scanned PDFs without a text layer show an error; OCR is not included.
- The word is aligned on its recognition point at all times, even with highlighting off, so its position never jumps.
- Keys: Space play/pause, Up/Down speed, Left/Right word, Home restart, End last word, Page Up/Down page, Esc exit.
- Speed changes made while reading are remembered per document; the default speed in Settings applies to new documents.
