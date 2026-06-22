import Stanza from 'togostanza/stanza';

export default class ApiProbe extends Stanza {
  async render() {
    this.renderCount = (this.renderCount || 0) + 1;
    this.importWebFontCSS('./assets/api-probe-font.css');

    const mainBeforeRender = this.root?.querySelector('main');
    const queryResult = await this.runOptionalQuery();

    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        elementTag: this.element?.tagName?.toLowerCase() || '',
        rootExists: Boolean(this.root),
        mainExists: Boolean(mainBeforeRender),
        renderCount: this.renderCount,
        stringParam: this.params['label'],
        numberParam: this.params['limit'],
        booleanParam: this.params['enabled'],
        jsonParam: JSON.stringify(this.params['payload']),
        queryStatus: queryResult.status,
        lastAttributeName: this.lastAttributeChange?.name || '',
        lastAttributeOldValue: this.lastAttributeChange?.oldValue || '',
        lastAttributeNewValue: this.lastAttributeChange?.newValue || ''
      }
    });

    const mainAfterRender = this.root?.querySelector('main');
    if (mainAfterRender) {
      mainAfterRender.dataset.apiProbeRoot = 'available';
      mainAfterRender.dataset.apiProbeElement = this.element?.tagName || '';
    }
  }

  handleAttributeChange(name, oldValue, newValue) {
    this.lastAttributeChange = { name, oldValue, newValue };
    super.handleAttributeChange(name, oldValue, newValue);
  }

  async runOptionalQuery() {
    const endpoint = this.params['query-endpoint'];
    if (!endpoint) {
      return { status: 'not-run' };
    }

    try {
      await this.query({
        template: 'query.sparql.hbs',
        parameters: {
          limit: this.params['limit'] || 1
        },
        endpoint
      });
      return { status: 'ok' };
    } catch (error) {
      return { status: `error:${error.name}` };
    }
  }
}
