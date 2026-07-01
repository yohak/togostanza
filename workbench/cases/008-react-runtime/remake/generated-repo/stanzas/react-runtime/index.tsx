import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import Stanza from 'togostanza/stanza';

type ReactRuntimeProps = {
  count: unknown;
  label: unknown;
  renderCount: number;
};

function ReactRuntimeApp({ count, label, renderCount }: ReactRuntimeProps) {
  return React.createElement(
    'section',
    { 'data-probe': 'react-runtime' },
    React.createElement('h1', null, 'React runtime probe'),
    React.createElement(
      'dl',
      null,
      React.createElement('dt', null, 'label'),
      React.createElement('dd', { 'data-probe': 'label' }, String(label)),
      React.createElement('dt', null, 'count'),
      React.createElement('dd', { 'data-probe': 'count' }, String(count)),
      React.createElement('dt', null, 'render count'),
      React.createElement('dd', { 'data-probe': 'render-count' }, renderCount)
    )
  );
}

export default class ReactRuntime extends Stanza {
  private reactRoot?: Root;
  private renderCount = 0;

  async render() {
    this.renderCount += 1;
    this.importWebFontCSS('./assets/react-runtime-font.css');

    const main = this.root.querySelector('main');

    if (!main) {
      throw new Error('Case 008 expected this.root.querySelector("main") to resolve');
    }

    this.reactRoot ??= createRoot(main);
    this.reactRoot.render(React.createElement(ReactRuntimeApp, {
      count: this.params.count,
      label: this.params.label,
      renderCount: this.renderCount,
    }));
  }

  handleAttributeChange(name: string, oldValue: string | null, newValue: string | null) {
    super.handleAttributeChange(name, oldValue, newValue);
  }
}
