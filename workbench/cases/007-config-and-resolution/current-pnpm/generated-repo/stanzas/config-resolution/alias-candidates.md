# Alias candidates

These imports are intentionally not active. They document shapes to consider when
checking migration notes and alias compatibility.

```js
import { fixtureLabel } from '%core/fixture-label.js';
import ConfigResolution from '%stanza/config-resolution/index.js';
```

The matching candidate paths are recorded in `../../tsconfig.json`.

`style.scss` also contains an active Sass alias reference:

```scss
@use "@/common.scss";
```
