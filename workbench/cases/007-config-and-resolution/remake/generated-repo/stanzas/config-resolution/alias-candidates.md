# Alias candidates

これらのimportは意図的に有効化していない。migration noteとalias互換性を確認するときに検討する形として記録する。

```js
import { observationLabel } from '%core/observation-label.js';
import ConfigResolution from '%stanza/config-resolution/index.js';
```

対応する候補pathは `../../tsconfig.json` に記録する。

`style.scss` には、有効なSass alias参照も含める。

```scss
@use "@/common.scss";
```
