import Stanza from 'togostanza/stanza';

export default class CoordinationSender extends Stanza {
  async render() {
    const value = this.params.value || 'from-sender';

    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: { value }
    });

    this.root.querySelector('[data-action="send"]')?.addEventListener(
      'click',
      () => {
        this.element.dispatchEvent(
          new CustomEvent('selectedValue', {
            detail: {
              payload: {
                label: value
              }
            }
          })
        );
      }
    );
  }
}
