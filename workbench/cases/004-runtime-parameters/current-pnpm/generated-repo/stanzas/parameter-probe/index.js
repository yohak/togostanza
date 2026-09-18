import Stanza from 'togostanza/stanza';

const PARAMETER_KEYS = [
  'label',
  'count',
  'flag',
  'payload',
  'mode',
  'note',
  '--parameter-probe-gap',
  '--parameter-probe-caption'
];

function formatValue(value) {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return String(value);
    }
  }

  return String(value);
}

export default class ParameterProbe extends Stanza {
  constructor(...args) {
    super(...args);
    try {
      const params = this.params;
      this.constructorParams = { count: String(params.count), ownCount: Object.hasOwn(params, 'count'), label: String(params.label) };
    } catch (error) {
      this.constructorParams = error.name;
    }
  }

  async render() {
    this.renderCount = (this.renderCount || 0) + 1;
    if (this.element.hasAttribute('skip-params')) {
      this.root.querySelector('main').textContent = 'skipped params';
      return;
    }

    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        renderCount: this.renderCount,
        rows: PARAMETER_KEYS.map((key) => {
          const value = this.params[key];

          return {
            key,
            value: formatValue(value),
            type: typeof value
          };
        }),
        lastAttributeName: this.lastAttributeChange?.name || '',
        lastAttributeOldValue: formatValue(this.lastAttributeChange?.oldValue),
        lastAttributeNewValue: formatValue(this.lastAttributeChange?.newValue)
      }
    });
  }

  handleAttributeChange(name, oldValue, newValue) {
    this.lastAttributeChange = { name, oldValue, newValue };
    super.handleAttributeChange(name, oldValue, newValue);
  }
}
