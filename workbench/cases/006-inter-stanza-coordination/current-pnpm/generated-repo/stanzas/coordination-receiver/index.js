import Stanza from 'togostanza/stanza';

export default class CoordinationReceiver extends Stanza {
  handleEvent() {}

  async render() {
    const selectedLabel = this.params['selected-label'] || '(none)';
    const dataUrl = this.params['data-url'];
    let dataSourceLabel = '(none)';

    if (dataUrl) {
      try {
        const data = await fetch(dataUrl).then((res) => res.json());
        dataSourceLabel = data.items?.[0]?.label || '(missing label)';
      } catch (error) {
        dataSourceLabel = `error: ${error.message}`;
      }
    }

    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        selectedLabel,
        dataUrl: dataUrl || '(none)',
        dataSourceLabel
      }
    });
  }
}
