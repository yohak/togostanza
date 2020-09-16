import { promises as fs } from 'fs';

import _Handlebars from 'handlebars';
import resolve from 'resolve';

export const packagePath = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
export const Handlebars = _Handlebars.create();

Handlebars.registerHelper('to-json', function(val) {
  return JSON.stringify(val);
});

export async function handlebarsTemplate(fpath, opts = {}) {
  const hbs = await fs.readFile(fpath, 'utf8');

  return Handlebars.compile(hbs, opts);
}

export function resolvePackage(name) {
  return resolve.sync(name, {basedir: packagePath});
}
