import Stanza from 'togostanza/stanza';
import { createApp } from 'vue';
import App from './App.vue';

export default class VueRuntime extends Stanza {
  async render() {
    const main = this.root.querySelector('main');

    if (!main) {
      throw new Error('Case 009 expected this.root.querySelector("main") to resolve');
    }

    this._app?.unmount();
    this._app = createApp(App, {
      label: this.params.label || '(missing label)'
    });
    this._app.mount(main);
  }
}

