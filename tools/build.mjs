#!/usr/bin/env node
/**
 * Mecatrônica 2025 — gerador do manifesto de mídias.
 *
 * Lê as pastas
 *   media/fotos     fotografias (jpg, jpeg, png, webp, avif, gif)
 *   media/videos    vídeos (mp4, webm, mov, m4v) e, opcionalmente, capas com o mesmo nome do vídeo
 *   media/musicas   trilhas (mp3, m4a, aac, ogg, opus, wav)
 * e escreve media/manifest.js, que o site lê ao abrir. Os números do site (fotografias,
 * vídeos) saem daqui: são sempre a contagem real dos arquivos.
 *
 * Recursos opcionais, detectados automaticamente:
 *   sharp (npm install)   versões WebP leves (640, 1280, 1920 px) e cor média de cada foto
 *   ffmpeg + ffprobe      capa, duração e proporção dos vídeos; título/artista das músicas
 * Sem eles o manifesto é gerado do mesmo jeito, apontando para os arquivos originais.
 *
 * Uso
 *   node tools/build.mjs              gera o manifesto (e as versões otimizadas, se possível)
 *   node tools/build.mjs --videos     também converte os vídeos para MP4 H.264 leve (até 1920 px)
 *   node tools/build.mjs --forcar     refaz todos os arquivos gerados
 *   node tools/build.mjs --sem-otimizar   só o manifesto, sem gerar imagens
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(ROOT, 'media');
const GEN = path.join(MEDIA, '_gerado');

const PHOTO_WIDTHS = [640, 1280, 1920];
const WEBP_QUALITY = 74;
const POSTER_WIDTH = 1280;

const EXT_PHOTO = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const EXT_VIDEO = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const EXT_AUDIO = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.wav']);
const EXT_POSTER = ['.jpg', '.jpeg', '.png', '.webp'];
const EXT_UNSUPPORTED = new Set(['.heic', '.heif', '.tif', '.tiff', '.cr2', '.nef', '.arw', '.dng', '.avi', '.wmv', '.mkv', '.3gp', '.flac', '.wma']);
const WEB_SAFE_CODECS = new Set(['h264', 'vp8', 'vp9', 'av1']);

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--forcar') || args.has('--force');
const TRANSCODE = args.has('--videos');
const NO_IMAGES = args.has('--sem-otimizar');

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
const warnings = [];
const expected = new Set();

/* ------------------------------------------------------------------ util */

const toPosix = (p) => p.split(path.sep).join('/');
const stripExt = (p) => p.replace(/\.[^./]+$/, '');
const extOf = (p) => path.extname(p).toLowerCase();
const warn = (msg) => warnings.push(msg);
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function isFresh(out, srcStat) {
  if (FORCE) return false;
  try { return (await fs.stat(out)).mtimeMs >= srcStat.mtimeMs; } catch { return false; }
}

async function walk(dir, base = dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(abs, base)));
    else if (e.isFile()) out.push(toPosix(path.relative(base, abs)));
  }
  return out.sort(collator.compare);
}

function run(cmd, cmdArgs) {
  return spawnSync(cmd, cmdArgs, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true });
}

function hasCommand(cmd) {
  const r = run(cmd, ['-version']);
  return !r.error && r.status === 0;
}

function loadSharp() {
  try { return createRequire(import.meta.url)('sharp'); } catch { return null; }
}

function progress(label, i, total) {
  if (!process.stdout.isTTY) return;
  process.stdout.write(`\r  ${label} ${i}/${total}   `);
  if (i === total) process.stdout.write('\n');
}

/** Caminho servido pelo site (relativo à raiz, com segmentos codificados para URL). */
function webPath(abs) {
  return toPosix(path.relative(ROOT, abs)).split('/').map(encodeURIComponent).join('/');
}

/** Nome legível a partir do arquivo: "03_nossa-musica.mp3" → "nossa-musica". */
function prettyName(rel) {
  const name = stripExt(path.posix.basename(rel));
  const clean = name.replace(/^\d+\s*[-_.)]\s*/, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  return clean || name;
}

/** Nomes automáticos de câmera/celular não viram título (o site mostra "Momento 01"). */
function isCameraName(rel) {
  const name = stripExt(path.posix.basename(rel));
  return /^(img|vid|mov|mvi|pxl|dsc|dscn|dcim|dji|gopr|gh\d|whatsapp|wa\d|video|vídeo|screen|captura|signal|telegram|snap|trim|\d)/i.test(prettyName(rel))
    || /\d{6,}/.test(name);
}

/* --------------------------------------------- tamanho de imagem (sem deps) */

function exifOrientation(b, start, end) {
  if (start + 8 > b.length) return 1;
  const le = b.toString('latin1', start, start + 2) === 'II';
  const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  const ifd = start + u32(start + 4);
  if (ifd + 2 > b.length) return 1;
  const count = u16(ifd);
  for (let k = 0; k < count; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > Math.min(b.length, end)) break;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return 1;
}

function parseJpeg(b) {
  let off = 2;
  let orientation = 1;
  while (off + 9 < b.length) {
    if (b[off] !== 0xff) return null;
    const marker = b[off + 1];
    if (marker === 0xff) { off += 1; continue; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; }
    const len = b.readUInt16BE(off + 2);
    if (marker === 0xe1 && b.toString('latin1', off + 4, off + 10) === 'Exif\0\0') {
      orientation = exifOrientation(b, off + 10, off + 2 + len);
    } else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      let h = b.readUInt16BE(off + 5);
      let w = b.readUInt16BE(off + 7);
      if (orientation >= 5 && orientation <= 8) [w, h] = [h, w];
      return { w, h };
    }
    off += 2 + len;
  }
  return null;
}

function parseImageSize(b) {
  if (b.length < 30) return null;
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString('latin1', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const kind = b.toString('latin1', 12, 16);
    if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
    if (kind === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
  }
  if (b[0] === 0xff && b[1] === 0xd8) return parseJpeg(b);
  const i = b.indexOf('ispe', 0, 'latin1');
  if (i > 0 && i + 16 <= b.length) return { w: b.readUInt32BE(i + 8), h: b.readUInt32BE(i + 12) };
  return null;
}

async function readImageSize(abs) {
  const fh = await fs.open(abs, 'r');
  try {
    const { size } = await fh.stat();
    let len = Math.min(size, 1024 * 1024);
    let buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, 0);
    let dims = parseImageSize(buf);
    if (!dims && len < size) {
      len = size;
      buf = Buffer.alloc(len);
      await fh.read(buf, 0, len, 0);
      dims = parseImageSize(buf);
    }
    return dims;
  } finally {
    await fh.close();
  }
}

/* ------------------------------------------------------------- fotografias */

function targetWidths(w) {
  const list = PHOTO_WIDTHS.filter((x) => x < w * 0.9);
  if (list.length < PHOTO_WIDTHS.length) list.push(w);
  return list;
}

const toHex = (r, g, b) => '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');

async function processPhotos(sharp) {
  const dir = path.join(MEDIA, 'fotos');
  const files = await walk(dir);
  const photos = [];
  const stems = new Map();

  for (const rel of files) {
    const ext = extOf(rel);
    if (EXT_UNSUPPORTED.has(ext)) {
      warn(`fotos/${rel}: formato ${ext} não abre nos navegadores — converta para JPG.`);
      continue;
    }
    if (!EXT_PHOTO.has(ext)) continue;
    // Duas fotos com o mesmo nome e extensões diferentes não podem gerar o mesmo .webp.
    const stem = stems.has(stripExt(rel)) ? `${stripExt(rel)}-${ext.slice(1)}` : stripExt(rel);
    stems.set(stripExt(rel), true);
    photos.push({ rel, stem });
  }

  const out = [];
  let i = 0;
  for (const { rel, stem } of photos) {
    progress('fotografias', ++i, photos.length);
    const abs = path.join(dir, rel);
    const stat = await fs.stat(abs);
    let w = 0;
    let h = 0;
    let color = null;
    let widths = [];

    if (sharp) {
      try {
        const meta = await sharp(abs).metadata();
        w = meta.width;
        h = meta.pageHeight || meta.height;
        if (meta.orientation >= 5) [w, h] = [h, w];
        const { data } = await sharp(abs).rotate().resize(1, 1, { fit: 'fill' }).removeAlpha().raw()
          .toBuffer({ resolveWithObject: true });
        color = toHex(data[0], data[1], data[2]);
        if (!NO_IMAGES) {
          widths = targetWidths(w);
          const jobs = [];
          for (const width of widths) {
            const target = path.join(GEN, 'fotos', String(width), `${stem}.webp`);
            expected.add(target);
            if (await isFresh(target, stat)) continue;
            await fs.mkdir(path.dirname(target), { recursive: true });
            jobs.push(sharp(abs).rotate().resize({ width, withoutEnlargement: true })
              .webp({ quality: WEBP_QUALITY, effort: 4 }).toFile(target));
          }
          await Promise.all(jobs);
        }
      } catch (err) {
        warn(`fotos/${rel}: não foi possível otimizar (${err.message.split('\n')[0]}).`);
        widths = [];
      }
    }

    if (!w || !h) {
      const dims = await readImageSize(abs).catch(() => null);
      if (dims && dims.w && dims.h) ({ w, h } = dims);
    }
    if (!w || !h) {
      warn(`fotos/${rel}: dimensões não identificadas — usando 3:2.`);
      w = 1500; h = 1000;
    }

    // Sem sharp nesta máquina: reaproveita versões geradas antes (em outra máquina, por exemplo).
    if (!widths.length) {
      const genDir = path.join(GEN, 'fotos');
      let sizes = [];
      try { sizes = (await fs.readdir(genDir)).filter((d) => /^\d+$/.test(d)).map(Number).sort((a, b) => a - b); } catch { /* nada gerado */ }
      for (const width of sizes) {
        const target = path.join(genDir, String(width), `${stem}.webp`);
        if (await exists(target)) { widths.push(width); expected.add(target); }
      }
    }

    const item = { src: webPath(abs), w, h };
    if (color) item.color = color;
    if (widths.length) {
      item.v = widths;
      item.g = webPath(path.join(GEN, 'fotos', '__W__', `${stem}.webp`)).replace('__W__', '{w}');
    }
    out.push(item);
  }
  return out;
}

/* ------------------------------------------------------------------ vídeos */

function probe(abs) {
  const r = run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', abs]);
  if (r.error || r.status !== 0) return null;
  let j;
  try { j = JSON.parse(r.stdout); } catch { return null; }
  const streams = j.streams || [];
  const v = streams.find((s) => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
  const tags = {};
  for (const [k, val] of Object.entries((j.format && j.format.tags) || {})) tags[k.toLowerCase()] = val;
  let w = v ? v.width : 0;
  let h = v ? v.height : 0;
  let rot = 0;
  if (v && v.tags && v.tags.rotate) rot = Number(v.tags.rotate);
  const side = v && (v.side_data_list || []).find((d) => d.rotation !== undefined);
  if (side) rot = Number(side.rotation);
  if (Math.abs(rot) % 180 === 90) [w, h] = [h, w];
  const duration = Number(j.format && j.format.duration) || Number(v && v.duration) || 0;
  return { w, h, duration, codec: v ? v.codec_name : null, tags };
}

async function processVideos(ffmpeg, config) {
  const dir = path.join(MEDIA, 'videos');
  const files = await walk(dir);
  const fileSet = new Set(files.map((f) => f.toLowerCase()));
  const titles = (config && config.videos) || {};
  const out = [];
  let i = 0;
  const videos = files.filter((rel) => {
    const ext = extOf(rel);
    if (EXT_UNSUPPORTED.has(ext)) warn(`videos/${rel}: formato ${ext} não toca nos navegadores — converta para MP4.`);
    return EXT_VIDEO.has(ext);
  });

  for (const rel of videos) {
    progress('vídeos', ++i, videos.length);
    const abs = path.join(dir, rel);
    const stat = await fs.stat(abs);
    const meta = ffmpeg ? probe(abs) : null;
    let src = abs;

    // Capa: imagem com o mesmo nome do vídeo (ex.: formatura.mp4 + formatura.jpg) tem prioridade.
    let poster = null;
    for (const ext of EXT_POSTER) {
      const candidate = stripExt(rel) + ext;
      if (fileSet.has(candidate.toLowerCase())) {
        poster = path.join(dir, files.find((f) => f.toLowerCase() === candidate.toLowerCase()));
        break;
      }
    }
    if (!poster) {
      const target = path.join(GEN, 'videos', `${stripExt(rel)}.jpg`);
      if (ffmpeg && !(await isFresh(target, stat))) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        const at = meta && meta.duration ? Math.min(1.5, meta.duration * 0.1) : 0;
        const r = run('ffmpeg', ['-y', '-v', 'error', '-ss', String(at), '-i', abs, '-frames:v', '1',
          '-vf', `scale='min(${POSTER_WIDTH},iw)':-2`, '-q:v', '4', target]);
        if (r.status !== 0) warn(`videos/${rel}: não foi possível gerar a capa.`);
      }
      if (await exists(target)) { poster = target; expected.add(target); }
    }

    // Versão leve em MP4 (com --videos). Conversões feitas antes continuam valendo sem a flag.
    const light = path.join(GEN, 'videos', `${stripExt(rel)}.mp4`);
    if (TRANSCODE && ffmpeg && !(await isFresh(light, stat))) {
      if (process.stdout.isTTY) process.stdout.write(`\r  convertendo ${rel}…            `);
      await fs.mkdir(path.dirname(light), { recursive: true });
      const r = run('ffmpeg', ['-y', '-v', 'error', '-i', abs, '-map', '0:v:0', '-map', '0:a:0?',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-maxrate', '6M', '-bufsize', '12M', '-pix_fmt', 'yuv420p',
        '-vf', "scale='if(gte(iw,ih),trunc(min(1920,iw)/2)*2,-2)':'if(gte(iw,ih),-2,trunc(min(1920,ih)/2)*2)'",
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', light]);
      if (r.status !== 0) warn(`videos/${rel}: falha na conversão (${(r.stderr || '').trim().split('\n').pop()}).`);
    }
    if (await exists(light)) { src = light; expected.add(light); }

    if (src === abs && meta && meta.codec && !WEB_SAFE_CODECS.has(meta.codec)) {
      warn(`videos/${rel}: codec ${meta.codec} pode não tocar em todos os navegadores — rode "npm run build:videos".`);
    }

    const item = { src: webPath(src) };
    if (poster) item.poster = webPath(poster);
    if (meta && meta.w && meta.h) { item.w = meta.w; item.h = meta.h; }
    if (meta && meta.duration) item.duration = round(meta.duration, 1);
    const base = path.posix.basename(rel);
    const title = titles[rel] || titles[base] || (meta && meta.tags.title) || (isCameraName(rel) ? null : prettyName(rel));
    if (title) item.title = String(title);
    out.push(item);
  }
  return out;
}

/* ----------------------------------------------------------------- músicas */

async function processMusic(ffmpeg) {
  const dir = path.join(MEDIA, 'musicas');
  const files = await walk(dir);
  const out = [];
  for (const rel of files) {
    const ext = extOf(rel);
    if (EXT_UNSUPPORTED.has(ext)) { warn(`musicas/${rel}: formato ${ext} não toca em todos os navegadores — converta para MP3.`); continue; }
    if (!EXT_AUDIO.has(ext)) continue;
    const abs = path.join(dir, rel);
    const meta = ffmpeg ? probe(abs) : null;
    const item = { src: webPath(abs), title: (meta && meta.tags.title) || prettyName(rel) };
    if (meta && meta.tags.artist) item.artist = meta.tags.artist;
    if (meta && meta.duration) item.duration = round(meta.duration, 1);
    out.push(item);
  }
  return out;
}

/* ------------------------------------------------------------------ config */

async function readConfig() {
  const file = path.join(MEDIA, 'config.json');
  if (!(await exists(file))) return {};
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    warn(`media/config.json inválido (${err.message}) — ignorado.`);
    return {};
  }
}

function checkConfig(config, photos) {
  const names = new Set();
  for (const p of photos) {
    const rel = decodeURIComponent(p.src).replace(/^media\/fotos\//, '');
    names.add(rel);
    names.add(path.posix.basename(rel));
  }
  for (const key of ['capa', 'abertura', 'final']) {
    if (config[key] && !names.has(config[key])) warn(`config.json: "${key}" aponta para "${config[key]}", que não está em media/fotos.`);
  }
  for (const name of config.destaques || []) {
    if (!names.has(name)) warn(`config.json: destaque "${name}" não está em media/fotos.`);
  }
}

/* ------------------------------------------------------------------- saída */

async function prune(dir) {
  let removed = 0;
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      removed += await prune(abs);
      if (!(await fs.readdir(abs)).length) await fs.rmdir(abs);
    } else if (!expected.has(abs)) {
      await fs.unlink(abs);
      removed += 1;
    }
  }
  return removed;
}

function serialize(manifest) {
  const lines = (arr) => (arr.length ? `[\n    ${arr.map((x) => JSON.stringify(x)).join(',\n    ')}\n  ]` : '[]');
  return [
    '/* Gerado automaticamente por tools/build.mjs — não edite à mão. Rode "npm run build" após mudar as mídias. */',
    'window.MEC_MEDIA = {',
    `  "generated": ${JSON.stringify(manifest.generated)},`,
    `  "photos": ${lines(manifest.photos)},`,
    `  "videos": ${lines(manifest.videos)},`,
    `  "music": ${lines(manifest.music)},`,
    `  "config": ${JSON.stringify(manifest.config)}`,
    '};',
    '',
  ].join('\n');
}

async function main() {
  if (args.has('--ajuda') || args.has('--help')) {
    console.log('Uso: node tools/build.mjs [--videos] [--forcar] [--sem-otimizar]');
    return;
  }
  for (const d of ['fotos', 'videos', 'musicas']) await fs.mkdir(path.join(MEDIA, d), { recursive: true });

  const sharp = NO_IMAGES ? null : loadSharp();
  const ffmpeg = hasCommand('ffmpeg') && hasCommand('ffprobe');
  console.log('Mecatrônica 2025 — preparando mídias');
  console.log(`  sharp: ${sharp ? 'sim (versões WebP otimizadas)' : 'não (usando arquivos originais — rode "npm install" para otimizar)'}`);
  console.log(`  ffmpeg: ${ffmpeg ? 'sim (capas e duração dos vídeos)' : 'não (vídeos sem capa gerada)'}`);

  const config = await readConfig();
  const photos = await processPhotos(sharp);
  const videos = await processVideos(ffmpeg, config);
  const music = await processMusic(ffmpeg);
  checkConfig(config, photos);

  const manifest = { generated: new Date().toISOString(), photos, videos, music, config };
  await fs.writeFile(path.join(MEDIA, 'manifest.js'), serialize(manifest));
  const removed = await prune(GEN);

  console.log(`\n  ${photos.length} fotografias · ${videos.length} vídeos · ${music.length} músicas`);
  if (removed) console.log(`  ${removed} arquivo(s) gerado(s) antigo(s) removido(s)`);
  console.log('  media/manifest.js atualizado.');
  if (warnings.length) {
    console.log(`\n  Avisos (${warnings.length}):`);
    for (const w of warnings) console.log(`  · ${w}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
