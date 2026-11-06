import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const src = join(root, 'web', 'src');
const shell = readFileSync(join(src, 'shell.html'), 'utf8');
const sim = readFileSync(join(src, 'sim.js'), 'utf8');
const ui = readFileSync(join(src, 'ui.js'), 'utf8');

if (!shell.includes('/*__SIM__*/') || !shell.includes('/*__UI__*/')) {
  throw new Error('Godscar web template placeholders are missing. Refusing to create a partial preview.');
}
const output = shell.replace('/*__SIM__*/', sim).replace('/*__UI__*/', ui);
if (output.includes('/*__SIM__*/') || output.includes('/*__UI__*/')) {
  throw new Error('Godscar browser build contains unresolved script placeholders.');
}

mkdirSync(join(root, 'web', 'dist'), { recursive: true });
writeFileSync(join(root, 'web', 'dist', 'index.html'), output, 'utf8');
console.log('Built the unchanged Godscar web engine and UI (' + output.length + ' characters).');
