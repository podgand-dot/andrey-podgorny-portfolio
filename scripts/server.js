/** Local-only content manager for the portfolio. Never use as a public production server. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { syncPublicData } from './sync-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const certDir = path.join(root, 'assets', 'certificates');
const thumbsDir = path.join(certDir, 'thumbnails');
const dataFile = path.join(root, 'data', 'certificates.json');
const notFoundPage = path.join(root, '404.html');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg'
};

const categoryLabels = {
  business: 'Бизнес и консалтинг',
  projects: 'Проектная деятельность',
  olympiads: 'Олимпиады',
  education: 'Образование и курсы'
};

const allowedTypes = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

/** Static 404: serve the site's 404.html when it exists, otherwise plain text. */
function sendNotFound(req, res) {
  fs.readFile(notFoundPage, (err, html) => {
    if (err) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    res.writeHead(404, { 'Content-Type': mime['.html'], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : html);
  });
}

function readCerts() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeCerts(rows) {
  const temp = dataFile + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, dataFile);
  syncPublicData();
}

function safeOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && Number(u.port || 80) === port;
  } catch {
    return false;
  }
}

function readBody(req, res, callback) {
  let raw = '', failed = false;
  req.on('data', chunk => {
    if (failed) return;
    raw += chunk;
    if (raw.length > 14 * 1024 * 1024) {
      failed = true;
      send(res, 413, { error: 'Файл слишком большой' });
    }
  });
  req.on('end', () => {
    if (failed) return;
    try {
      callback(JSON.parse(raw || '{}'));
    } catch {
      send(res, 400, { error: 'Некорректный JSON' });
    }
  });
}

function slug(text) {
  return String(text || 'certificate').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60) || 'certificate';
}

function parseUpload(data) {
  if (!data.fileBase64) return null;
  const match = String(data.fileBase64).match(/^data:(image\/png|image\/jpeg|image\/webp|application\/pdf);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Поддерживаются только PNG, JPG, WebP и PDF');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 10 * 1024 * 1024) throw new Error('Максимальный размер файла — 10 МБ');
  const sig = buffer.subarray(0, 12), type = match[1];
  const valid = type === 'application/pdf'
    ? sig.toString('ascii', 0, 5) === '%PDF-'
    : type === 'image/png'
      ? sig.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : type === 'image/jpeg'
        ? sig[0] === 255 && sig[1] === 216 && sig[2] === 255
        : sig.toString('ascii', 0, 4) === 'RIFF' && sig.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new Error('Содержимое файла не совпадает с его форматом');
  return { buffer, type, ext: allowedTypes[type] };
}

/**
 * Saves an uploaded certificate and makes an 800px JPEG thumbnail with macOS `sips`.
 * The data file stores the full image and thumbnail paths, so these thumbnails can sit
 * next to the WebP thumbnails of the existing certificates.
 */
function storeFile(upload, title) {
  fs.mkdirSync(thumbsDir, { recursive: true });
  const filename = Date.now() + '-' + slug(title) + upload.ext;
  const dest = path.join(certDir, filename);
  fs.writeFileSync(dest, upload.buffer, { flag: 'wx' });
  let thumbnail = 'assets/certificates/thumbnails/pdf.svg';
  if (upload.ext !== '.pdf') {
    const name = path.basename(filename, upload.ext) + '.jpg';
    try {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '800', '-s', 'formatOptions', '82', dest, '--out', path.join(thumbsDir, name)], { stdio: 'ignore' });
      thumbnail = 'assets/certificates/thumbnails/' + name;
    } catch {
      thumbnail = 'assets/certificates/' + filename;
    }
  }
  return { image: 'assets/certificates/' + filename, thumbnail };
}

function cleanOldFiles(cert) {
  const managedRoots = [certDir, path.join(root, 'assets', 'letters')];
  for (const field of ['image', 'thumbnail']) {
    const value = cert[field] || '';
    const full = path.resolve(root, value);
    if (!managedRoots.some(dir => full.startsWith(dir + path.sep)) || value.endsWith('/pdf.svg')) continue;
    try { fs.unlinkSync(full); } catch {}
  }
}

function validateMeta(data, old = {}) {
  const title = String(data.title ?? old.title ?? '').trim(),
    issuer = String(data.issuer ?? old.issuer ?? '').trim(),
    category = String(data.category ?? old.category ?? 'projects');
  if (!title || !issuer) throw new Error('Название и организация обязательны');
  if (!categoryLabels[category]) throw new Error('Выберите категорию');
  const date = String(data.date ?? old.date ?? '').trim(),
    description = String(data.description ?? old.description ?? '').trim();
  if (!description) throw new Error('Добавьте описание сертификата');
  if (description.length > 4000) throw new Error('Описание не должно превышать 4000 символов');
  if (title.length > 180 || issuer.length > 180) throw new Error('Название и организация не должны превышать 180 символов');
  return {
    id: old.id || 'cert-' + Date.now(),
    title,
    issuer,
    category,
    categoryLabel: categoryLabels[category],
    date,
    year: (date.match(/20\d{2}/) || [])[0] || String(old.year || new Date().getFullYear()),
    award: String(data.award ?? old.award ?? '').trim(),
    description,
    skills: Array.isArray(data.skills) ? data.skills.map(String).map(x => x.trim()).filter(Boolean) : old.skills || [],
    image: old.image || '',
    thumbnail: old.thumbnail || ''
  };
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1:' + port);
  let pathname;
  try {
    pathname = decodeURIComponent(u.pathname);
  } catch {
    return send(res, 400, { error: 'Некорректный путь' });
  }

  if (pathname.startsWith('/api/')) {
    if (!safeOrigin(req) || req.headers['sec-fetch-site'] === 'cross-site') return send(res, 403, { error: 'Запрос разрешён только с локальной панели' });
    if (pathname === '/api/status' && req.method === 'GET') return send(res, 200, { status: 'ok' });
    if (pathname === '/api/certificates' && req.method === 'GET') {
      try {
        return send(res, 200, { certificates: readCerts() });
      } catch {
        return send(res, 500, { error: 'Не удалось прочитать список сертификатов' });
      }
    }
    if (pathname === '/api/certificates' && req.method === 'POST') return readBody(req, res, data => {
      try {
        const upload = parseUpload(data);
        if (!upload) throw new Error('Выберите файл');
        const cert = validateMeta(data);
        Object.assign(cert, storeFile(upload, cert.title));
        const rows = readCerts();
        rows.unshift(cert);
        writeCerts(rows);
        send(res, 201, { success: true, certificate: cert });
      } catch (e) {
        send(res, 400, { error: e.message });
      }
    });
    const match = pathname.match(/^\/api\/certificates\/([a-zA-Z0-9_-]+)$/);
    if (match && req.method === 'PUT') return readBody(req, res, data => {
      try {
        const rows = readCerts(), i = rows.findIndex(x => x.id === match[1]);
        if (i < 0) return send(res, 404, { error: 'Сертификат не найден' });
        const old = rows[i], cert = validateMeta(data, old), upload = parseUpload(data);
        if (upload) {
          Object.assign(cert, storeFile(upload, cert.title));
          cleanOldFiles(old);
        }
        rows[i] = cert;
        writeCerts(rows);
        send(res, 200, { success: true, certificate: cert });
      } catch (e) {
        send(res, 400, { error: e.message });
      }
    });
    if (match && req.method === 'DELETE') {
      try {
        const rows = readCerts(), i = rows.findIndex(x => x.id === match[1]);
        if (i < 0) return send(res, 404, { error: 'Сертификат не найден' });
        const [old] = rows.splice(i, 1);
        writeCerts(rows);
        cleanOldFiles(old);
        return send(res, 200, { success: true });
      } catch {
        return send(res, 500, { error: 'Не удалось удалить запись' });
      }
    }
    return send(res, 404, { error: 'Метод не найден' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain; charset=utf-8');
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';
  if (pathname === '/') pathname = '/index.html';
  if (pathname.split('/').some(part => part.startsWith('.') && part !== '.')) return sendNotFound(req, res);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return sendNotFound(req, res);
    const type = mime[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

syncPublicData();
server.listen(port, '127.0.0.1', () => console.log('Портфолио: http://127.0.0.1:' + port + '\nУправление сертификатами: http://127.0.0.1:' + port + '/admin'));
