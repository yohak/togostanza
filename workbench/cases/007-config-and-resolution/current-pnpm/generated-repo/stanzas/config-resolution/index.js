import Stanza from 'togostanza/stanza';
import packageMarkerUrl from 'case-007-asset-package/package-marker.svg';
import { observationLabel } from '../../lib/observation-label.js';
import localMarkerUrl from './assets/local-marker.svg';

const rootPublicAssetPath = './assets/root-public-marker.txt';

export default class ConfigResolution extends Stanza {
  async render() {
    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        observationLabel: observationLabel(),
        localMarkerUrl,
        packageMarkerUrl,
        rootPublicAssetPath
      }
    });
  }
}
