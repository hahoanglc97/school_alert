const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4173;
const MUSIC_DIR = path.join(__dirname, 'music');
const MANIFEST_PATH = path.join(MUSIC_DIR, 'manifest.json');
const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULE_PATH = path.join(DATA_DIR, 'schedule.json');
const DEFAULT_SCHEDULE = { schedules: [], settings: { timezone: 'Asia/Ho_Chi_Minh', scheduler: true } };

fs.mkdirSync(MUSIC_DIR, { recursive: true });
if (!fs.existsSync(MANIFEST_PATH)) fs.writeFileSync(MANIFEST_PATH, '[]');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SCHEDULE_PATH)) fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(DEFAULT_SCHEDULE, null, 2));

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}
function writeManifest(list) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(list, null, 2));
}
function readSchedule() {
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'));
  } catch {
    return DEFAULT_SCHEDULE;
  }
}
function writeSchedule(data) {
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(data, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MUSIC_DIR),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.mp3`),
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isMp3 = file.mimetype === 'audio/mpeg' || file.originalname.toLowerCase().endsWith('.mp3');
    cb(isMp3 ? null : new Error(`${file.originalname} không phải là tệp MP3.`), isMp3);
  },
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (/\.(html|js|css)$/.test(filePath)) res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  },
}));
app.use('/music', express.static(MUSIC_DIR));
app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

app.get('/api/music', (req, res) => {
  res.json(readManifest());
});

app.post('/api/music', upload.array('files', 20), (req, res) => {
  const manifest = readManifest();
  const added = [];
  const skipped = [];
  for (const file of req.files || []) {
    const name = file.originalname;
    if (manifest.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      fs.unlinkSync(file.path);
      skipped.push(name);
      continue;
    }
    const entry = {
      id: crypto.randomUUID(),
      name,
      filename: file.filename,
      url: `/music/${file.filename}`,
      createdAt: new Date().toISOString(),
    };
    manifest.push(entry);
    added.push(entry);
  }
  writeManifest(manifest);
  res.json({ added, skipped, music: manifest });
});

app.delete('/api/music/:id', (req, res) => {
  const manifest = readManifest();
  const entry = manifest.find(m => m.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Không tìm thấy tệp nhạc.' });
  const filePath = path.join(MUSIC_DIR, entry.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  writeManifest(manifest.filter(m => m.id !== entry.id));
  res.json({ ok: true });
});

app.get('/api/schedule', (req, res) => {
  res.json(readSchedule());
});

app.put('/api/schedule', (req, res) => {
  const { schedules, settings } = req.body || {};
  if (!Array.isArray(schedules) || typeof settings !== 'object' || settings === null) {
    return res.status(400).json({ error: 'Dữ liệu lịch không hợp lệ.' });
  }
  const data = { schedules, settings };
  writeSchedule(data);
  res.json(data);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Tải lên thất bại.' });
});

app.listen(PORT, () => {
  console.log(`Server sẵn sàng tại http://localhost:${PORT}`);
  console.log(`Tệp MP3 được lưu tại ${MUSIC_DIR}`);
});
