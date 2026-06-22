# current

Fixture project for observing current-version inter-stanza coordination behavior.

This project intentionally keeps the setup small:

- `coordination-sender` dispatches `selectedValue`.
- `coordination-receiver` displays values received through attributes.
- `fixtures/inter-stanza.html` embeds both stanzas inside `togostanza--container`.

## Fixture structure

- `stanzas/coordination-sender/` observes outgoing event dispatch. The button in its template dispatches `selectedValue` with `detail.payload.label`.
- `stanzas/coordination-receiver/` observes values assigned through attributes. It renders `selected-label`, `data-url`, and the first label fetched from `data-url`.
- `fixtures/inter-stanza.html` wires the fixture with `togostanza--container`, `togostanza--event-map`, and `togostanza--data-source`.
- `fixtures/sample-data.json` is the minimal external data loaded through `togostanza--data-source`.

## Coordination elements

- `togostanza--container` is the current-version entry point for coordinating the child stanzas.
- `togostanza--event-map` listens for `selectedValue`, reads `payload.label` via `value-path`, and assigns it to the receiver's `selected-label` attribute.
- `togostanza--data-source` reads `fixtures/sample-data.json` and assigns the generated data URL to the receiver's `data-url` attribute.
- `togostanza--data-container` is intentionally not present in this fixture because the case treats it as an old documentation typo, not as a current custom element to preserve.

## Planned commands

Run from this directory when current-version observation is needed:

```sh
mise exec -- npm install
mise exec -- npx togostanza build --output-path dist
```

After build, open `fixtures/inter-stanza.html` in a browser and verify that the receiver reflects the event-mapped `selected-label` and the data-source label.

## Current observation status

- `npm install`: not run.
- `mise exec -- npx togostanza build --output-path dist`: not run.
- Browser verification: not run.
