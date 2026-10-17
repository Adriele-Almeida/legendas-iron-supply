// Gera data.js a partir do arquivo de legendas (.txt) + drive-files.json
// Uso: node build-data.mjs /workspace/legendas-iron-supply-v2.txt
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const txtPath = process.argv[2];
if (!txtPath) { console.error('Uso: node build-data.mjs <arquivo-legendas.txt>'); process.exit(1); }

const PRODUCTS = [
  'Batoque de Silicone InkCap', 'Caneta Free Hand Dark', 'Cartuchos EZ V-Select', 'Cartuchos Razor',
  'Cartuchos Tiger Eyes', 'Cartuchos Tiger Strike', 'Cartuchos WJX Ultimate', 'Cartuchos WJX Ultra',
  'Easy Inn Tattoo Butter', 'FK Irons ONE', 'Impressora Térmica SkullDNA', 'Ink Mixer DKLAB',
  'Máquina Pen EZ P6', 'No Plastic e Seal Up', 'Papel Inkdraw', 'Papel Transfer Magistério U-20',
  'Slimer Tattoo Gel 90g', 'Tinta Ultra Black Electric Ink', 'Tintas Intenze', 'Transfer Proton',
];
const norm = s => s.normalize('NFC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Legendas: blocos separados por linhas contendo apenas '---'
const raw = readFileSync(txtPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const blocks = raw.split(/^[ \t]*---[ \t]*$/m)
  .map(b => b.replace(/^\s*\n/, '').replace(/\n\s*$/, '').replace(/^\n+|\n+$/g, ''))
  .filter(b => b.trim());
const captions = new Map();
for (const b of blocks) captions.set(norm(b.split('\n')[0]), b);

// Imagens do Drive: casadas pelo nome do arquivo ("<Produto> - Post/Story (n).ext")
const files = JSON.parse(readFileSync(join(here, 'drive-files.json'), 'utf8'));
const rank = name => {
  const m = name.match(/ - (Post|Story)(?: \((\d+)\))?\.[a-z0-9]+$/i);
  if (!m) return 999;
  return (m[1].toLowerCase() === 'post' ? 0 : 100) + (m[2] ? Number(m[2]) : 1);
};
// Uma imagem por produto: prefere "Post" sem número, depois o menor número; se não houver Post, usa "Story".
const imageFor = p => {
  const [best] = files
    .filter(([, name]) => norm(name.replace(/ - (Post|Story).*$/i, '')) === norm(p))
    .sort((a, b) => rank(a[1]) - rank(b[1]));
  if (!best) return null;
  const [id, name] = best;
  return {
    id, name,
    tipo: /story/i.test(name) ? 'Story' : 'Post',
    view: `https://drive.google.com/file/d/${id}/view`,
    thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
  };
};

const problems = [];
const data = PRODUCTS.map(name => {
  const caption = captions.get(norm(name)) ?? null;
  const image = imageFor(name);
  if (!caption) problems.push(`SEM LEGENDA: ${name}`);
  if (!image) problems.push(`SEM IMAGEM: ${name}`);
  return { name, caption, tipo: image ? image.tipo : null, image };
});
const known = new Set(PRODUCTS.map(norm));
for (const k of captions.keys()) if (!known.has(k)) problems.push(`LEGENDA NAO USADA: ${k}`);

writeFileSync(join(here, 'data.js'),
  `// Gerado por build-data.mjs a partir de ${txtPath.split('/').pop()} em ${new Date().toISOString()}\n` +
  `window.PRODUTOS = ${JSON.stringify(data, null, 2)};\n`);
console.log(`data.js: ${data.length} produtos, ${blocks.length} legendas no arquivo, ${data.filter(d => d.image).length} com imagem.`);
problems.forEach(p => console.warn('AVISO', p));
