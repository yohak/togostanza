import Stanza from 'togostanza/stanza';
import packageMarkerUrl from 'case-007-asset-package/package-marker.svg';
import { fixtureLabel } from '../../lib/fixture-label.js';
import localMarkerUrl from './assets/local-marker.svg';

const rootPublicAssetPath = './assets/root-public-marker.txt';

export default class ConfigResolution extends Stanza {
  async render() {
    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        fixtureLabel: fixtureLabel(),
        localMarkerUrl,
        packageMarkerUrl,
        rootPublicAssetPath
      }
    });
  }
}
