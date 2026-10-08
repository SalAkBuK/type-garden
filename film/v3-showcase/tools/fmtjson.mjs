// Compact, string-safe JSON writer for motion.json: primitives, numeric key tables and keyframe objects stay on one line.
import fs from 'node:fs';
const prim = v => v === null || typeof v !== 'object';
const one = v => JSON.stringify(v).replace(/,(?=["{\[\d-])/g, (m, off, str) => {
  // add a space after commas that are outside strings
  let inStr = false, esc = false;
  for (let i = 0; i < off; i++) { const c = str[i]; if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === '"') inStr = !inStr; }
  return inStr ? m : ', ';
});
const inline = v => prim(v) || (Array.isArray(v) && v.every(prim)) || ((Array.isArray(v) || (typeof v === 'object' && 'f' in v)) && JSON.stringify(v).length < 175 && JSON.stringify(v).split('[').length < 12 && !Object.values(v).some(x => !prim(x) && !Array.isArray(x)));
export function fmt(v, ind = '') {
  if (inline(v)) return one(v);
  if (Array.isArray(v)) return '[\n' + v.map(x => ind + '  ' + fmt(x, ind + '  ')).join(',\n') + '\n' + ind + ']';
  return '{\n' + Object.keys(v).map(k => ind + '  ' + JSON.stringify(k) + ': ' + fmt(v[k], ind + '  ')).join(',\n') + '\n' + ind + '}';
}
if (process.argv[2]) {
  const file = process.argv[2], data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (process.argv[3]) { const bak = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); for (const k of ['notes', 'credits', 'concept', 'status']) data[k] = bak[k]; }
  const text = fmt(data) + '\n';
  JSON.parse(text);
  fs.writeFileSync(file, text);
  console.log(text.split('\n').length + ' lines; notes[0]: ' + data.notes[0]);
}
