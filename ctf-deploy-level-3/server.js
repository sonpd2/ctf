const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const FLAGS = require("./server/flags.json"); // { id: { diff, hash, hint } }
let OBJDATA = { story: "", list: [] }; try { OBJDATA = require("./server/objectives.json"); } catch {}
const PTS = { easy: 100, medium: 250, hard: 500, insane: 750 };
const MAX_ATTEMPTS = 2;
const HINT_FACTOR = 0.8; // xem hint → trừ ngay 20% điểm gốc (có thể âm)
const DATA = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA, { recursive: true });

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const adminEnabled = () => ADMIN_PASS.length > 0;
const adminToken = () => crypto.createHash("sha256").update(ADMIN_USER + ":" + ADMIN_PASS).digest("hex");

const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};
const norm = (s) => {
  let x = String(s).trim().toLowerCase().replace(/\s+/g, "");
  // bỏ nháy bọc do shell/copy: 'a|b|c' hoặc "a|b|c"
  if ((x.startsWith("'") && x.endsWith("'")) || (x.startsWith('"') && x.endsWith('"'))) x = x.slice(1, -1);
  const m = x.match(/^lsec\{(.*)\}$/);
  return m ? m[1] : x;
};

const slug = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "anon";
const okSlug = (s) => /^[a-z0-9-]{1,40}$/.test(s);

const scryptHash = (pass, salt) => crypto.scryptSync(String(pass), salt, 32).toString("hex");
const makePass = (pass) => { const salt = crypto.randomBytes(16).toString("hex"); return { salt, hash: scryptHash(pass, salt) }; };
const checkPass = (pass, rec) => {
  if (!rec.passSalt || !rec.passHash) return false;
  const a = Buffer.from(scryptHash(pass, rec.passSalt), "hex"), b = Buffer.from(rec.passHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const fp = (s) => path.join(DATA, s + ".json");
const readRec = (s) => { try { return JSON.parse(fs.readFileSync(fp(s), "utf8")); } catch { return null; } };
const writeRec = (s, rec) => fs.writeFileSync(fp(s), JSON.stringify(rec));
const allRecs = () => { try { return fs.readdirSync(DATA).filter((f) => f.endsWith(".json")).map((f) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")); } catch { return null; } }).filter(Boolean); } catch { return []; } };
const hintPenaltyOf = (id) => Math.floor((PTS[(FLAGS[id] && FLAGS[id].diff) || ""] || 0) * (1 - HINT_FACTOR));
const scoreOf = (rec) => {
  let s = 0;
  for (const [id, v] of Object.entries(rec.solves || {})) {
    if (v && typeof v.points === "number") s += v.points;
    else if (FLAGS[id]) s += PTS[FLAGS[id].diff] || 0;
  }
  for (const id of Object.keys(rec.hints || {})) {
    if (rec.hints[id]) s -= hintPenaltyOf(id);
  }
  return s;
};
const pub = (rec) => ({
  name: rec.name,
  startMs: rec.startMs,
  solves: rec.solves || {},
  attempts: rec.attempts || {},
  hints: rec.hints || {},
  score: scoreOf(rec),
});

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/api/objectives", (req, res) => res.json({
  story: OBJDATA.story,
  maxAttempts: MAX_ATTEMPTS,
  hintPenalty: "20%",
  objectives: OBJDATA.list.map((o) => ({ ...o, points: PTS[o.diff] })),
}));

app.get("/api/players", (req, res) => res.json(allRecs().filter((r) => r.status === "approved").map(pub)));

app.get("/api/player/:slug", (req, res) => {
  if (!okSlug(req.params.slug)) return res.status(400).end();
  const rec = readRec(req.params.slug);
  if (!rec || rec.status !== "approved") return res.status(404).end();
  res.json(pub(rec));
});

app.post("/api/register", (req, res) => {
  const name = String((req.body && req.body.name) || "").trim().slice(0, 24);
  const password = String((req.body && req.body.password) || "");
  if (name.length < 2) return res.status(400).json({ message: "Callsign tối thiểu 2 ký tự." });
  if (password.length < 4) return res.status(400).json({ message: "Mật khẩu tối thiểu 4 ký tự." });
  const s = slug(name);
  if (readRec(s)) return res.status(409).json({ message: "Callsign đã tồn tại — chọn tên khác." });
  const { salt, hash } = makePass(password);
  writeRec(s, { name, passSalt: salt, passHash: hash, status: "pending", solves: {}, attempts: {}, hints: {}, createdMs: Date.now() });
  res.json({ status: "pending", message: "Đăng ký thành công — chờ admin duyệt rồi đăng nhập." });
});

app.post("/api/login", (req, res) => {
  const name = String((req.body && req.body.name) || "").trim().slice(0, 24);
  const password = String((req.body && req.body.password) || "");
  const s = slug(name); const rec = readRec(s);
  if (!rec || !checkPass(password, rec)) return res.status(401).json({ message: "Sai callsign hoặc mật khẩu." });
  if (rec.status === "pending") return res.status(403).json({ status: "pending", message: "Tài khoản đang chờ admin duyệt." });
  if (rec.status !== "approved") return res.status(403).json({ message: "Tài khoản không được phép vào thi." });
  rec.token = crypto.randomBytes(24).toString("hex");
  if (!rec.startMs) rec.startMs = Date.now();
  if (!rec.hints) rec.hints = {};
  writeRec(s, rec);
  res.json({ token: rec.token, player: pub(rec) });
});

app.post("/api/hint", (req, res) => {
  const { name, token, id, confirm } = req.body || {};
  const c = FLAGS[id];
  if (!c || !c.hint) return res.status(400).json({ status: "error", message: "Challenge không tồn tại." });
  const s = slug(name || ""); const rec = readRec(s);
  if (!rec || rec.status !== "approved") return res.status(403).json({ status: "error", message: "Tài khoản chưa được phép." });
  if (rec.token !== token) return res.status(403).json({ status: "error", message: "Phiên không hợp lệ — đăng nhập lại." });
  if (rec.solves && rec.solves[id]) return res.json({ status: "already", message: "Đã giải — không xem hint.", player: pub(rec) });
  const used = (rec.attempts && rec.attempts[id]) || 0;
  if (used >= MAX_ATTEMPTS) return res.json({ status: "locked", message: "Challenge đã khóa — không xem hint.", player: pub(rec) });
  const penalty = hintPenaltyOf(id);
  if (rec.hints && rec.hints[id]) {
    return res.json({ status: "ok", hint: c.hint, penalty, already: true, player: pub(rec) });
  }
  if (!confirm) {
    return res.json({
      status: "confirm",
      message: "Xem hint sẽ TRỪ NGAY " + penalty + " điểm (có thể âm). Gõ: ctf hint " + id + " confirm",
      penalty,
      player: pub(rec),
    });
  }
  rec.hints = rec.hints || {};
  rec.hints[id] = true;
  writeRec(s, rec);
  return res.json({ status: "ok", hint: c.hint, penalty, score: scoreOf(rec), player: pub(rec) });
});

app.post("/api/submit", (req, res) => {
  const { name, token, id, answer } = req.body || {};
  const c = FLAGS[id];
  if (!c) return res.status(400).json({ status: "error", message: "Challenge không tồn tại." });
  const s = slug(name || ""); const rec = readRec(s);
  if (!rec || rec.status !== "approved") return res.status(403).json({ status: "error", message: "Tài khoản chưa được phép." });
  if (rec.token !== token) return res.status(403).json({ status: "error", message: "Phiên không hợp lệ — đăng nhập lại." });
  if (!rec.startMs) { rec.startMs = Date.now(); writeRec(s, rec); }
  if (rec.solves[id]) return res.json({ status: "already", message: "Challenge này đã capture rồi.", player: pub(rec) });
  const used = (rec.attempts && rec.attempts[id]) || 0;
  if (used >= MAX_ATTEMPTS) return res.json({ status: "locked", message: "Đã hết " + MAX_ATTEMPTS + " lượt thử cho challenge này.", player: pub(rec) });
  if (cyrb53(norm(answer || "")) === c.hash) {
    const atMs = Date.now();
    const points = PTS[c.diff] || 0; // đủ điểm gốc; hint đã trừ riêng trên bảng điểm
    rec.solves[id] = { atMs, elapsedMs: atMs - rec.startMs, points };
    writeRec(s, rec);
    const note = (rec.hints && rec.hints[id]) ? " (đã trừ hint trước đó)" : "";
    return res.json({ status: "solved", message: "FLAG ACCEPTED  ·  +" + points + " điểm" + note + " · tổng " + scoreOf(rec), player: pub(rec) });
  }
  rec.attempts = rec.attempts || {};
  rec.attempts[id] = used + 1;
  writeRec(s, rec);
  const left = MAX_ATTEMPTS - rec.attempts[id];
  return res.json({ status: "wrong", message: left > 0 ? "Sai đáp án. Còn " + left + " lượt thử." : "Sai đáp án. Đã hết lượt — challenge này bị khóa.", player: pub(rec) });
});

const requireAdmin = (req, res, next) => {
  if (!adminEnabled()) return res.status(403).json({ message: "Chưa bật admin (đặt biến ADMIN_PASS)." });
  if (req.get("x-admin-token") !== adminToken()) return res.status(403).json({ message: "Không có quyền admin." });
  next();
};
app.post("/api/admin/login", (req, res) => {
  if (!adminEnabled()) return res.status(403).json({ message: "Chưa bật admin (đặt biến ADMIN_PASS)." });
  const u = String((req.body && req.body.user) || ""); const p = String((req.body && req.body.pass) || "");
  if (u !== ADMIN_USER || p !== ADMIN_PASS) return res.status(401).json({ message: "Sai tài khoản admin." });
  res.json({ token: adminToken() });
});
app.get("/api/admin/list", requireAdmin, (req, res) => {
  res.json(allRecs().map((r) => ({ name: r.name, status: r.status, solved: Object.keys(r.solves || {}).length, createdMs: r.createdMs || 0 }))
    .sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || a.createdMs - b.createdMs));
});
app.post("/api/admin/approve", requireAdmin, (req, res) => {
  const s = slug(String((req.body && req.body.name) || "")); const rec = readRec(s);
  if (!rec) return res.status(404).json({ message: "Không tìm thấy." });
  rec.status = "approved"; writeRec(s, rec); res.json({ ok: true });
});
app.post("/api/admin/delete", requireAdmin, (req, res) => {
  const s = slug(String((req.body && req.body.name) || "")); if (!okSlug(s)) return res.status(400).end();
  try { fs.unlinkSync(fp(s)); } catch {} res.json({ ok: true });
});
app.post("/api/reset", requireAdmin, (req, res) => {
  let n = 0; for (const f of fs.readdirSync(DATA)) { if (f.endsWith(".json")) { fs.unlinkSync(path.join(DATA, f)); n++; } }
  res.json({ ok: true, cleared: n });
});

app.get("/", (req, res) => res.type("text").send("Linux Security CTF L3 — API. Terminal :8081."));

if (process.env.SHARE_FILES_DIR) {
  try {
    const src = path.join(__dirname, "challenge-files");
    fs.mkdirSync(process.env.SHARE_FILES_DIR, { recursive: true });
    fs.cpSync(src, process.env.SHARE_FILES_DIR, { recursive: true });
    console.log("Đã copy file đề sang " + process.env.SHARE_FILES_DIR);
  } catch (e) { console.error("copy file đề thất bại:", e.message); }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("CTF L3 on :" + PORT + " (admin " + (adminEnabled() ? "ON" : "OFF") + ", attempts=" + MAX_ATTEMPTS + ")"));
