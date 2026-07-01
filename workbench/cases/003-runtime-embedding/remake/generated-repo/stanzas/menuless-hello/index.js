import Stanza from 'togostanza/stanza';

export default class MenulessHello extends Stanza {
  async render() {
    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        greeting: `Hello without menu, ${this.params['say-to']}!`
      }
    });
  }
}
