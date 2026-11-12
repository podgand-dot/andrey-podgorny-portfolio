import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const categories = ['projects', 'certificates', 'experience'];

export function syncPublicData() {
  const data = Object.fromEntries(categories.map(name => [
    name, JSON.parse(fs.readFileSync(path.join(root, 'data', `${name}.json`), 'utf8'))
  ]));
  const output = `/* Generated from the JSON files in this folder. */\nwindow.PORTFOLIO_DATA = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(path.join(root, 'data', 'portfolio-data.js'), output, 'utf8');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncPublicData();
}
