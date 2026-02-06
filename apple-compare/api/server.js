const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ===== CONFIG =====
const JWT_SECRET = "change_this_secret";
const ADMIN_USER = "admin";
const ADMIN_PASS_HASH = bcrypt.hashSync("admin123", 10);
// ==================

const db = new Database("db.sqlite");

// ----- DB schema -----
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    is_authorised INTEGER NOT NULL DEFAULT 0,
    base_url TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 50,
    notes TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    price_inr INTEGER NOT NULL,
    warranty_type TEXT NOT NULL,
    return_days INTEGER NOT NULL DEFAULT 0,
    product_url TEXT NOT NULL,
    last_checked_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY(seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
    UNIQUE(product_id, seller_id)
  );
`);

// ----- Auth helper -----
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ----- Login -----
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER) return res.status(401).json({ error: "Invalid" });
  if (!bcrypt.compareSync(password || "", ADMIN_PASS_HASH)) {
    return res.status(401).json({ error: "Invalid" });
  }
const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token });
});

// ----- Public APIs -----
app.get("/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  res.json(rows);
});
// ----- Public APIs: sellers -----
app.get("/sellers", (req, res) => {
  const rows = db.prepare("SELECT * FROM sellers ORDER BY name ASC").all();
  res.json(rows);
});


app.get("/products/:slug", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE slug=?").get(req.params.slug);
  if (!product) return res.status(404).json({ error: "Not found" });

  const offers = db.prepare(`
    SELECT o.*, s.name seller_name, s.is_authorised, s.score seller_score
    FROM offers o
    JOIN sellers s ON s.id=o.seller_id
    WHERE o.product_id=?
    ORDER BY s.is_authorised DESC, o.price_inr ASC
  `).all(product.id);

  res.json({ product, offers });
});

// ----- Start server -----
// ----- Admin: create product -----
app.post("/admin/products", auth, (req, res) => {
  const { slug, name, category, image_url } = req.body || {};

  if (!slug || !name || !category || !image_url) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const info = db.prepare(`
      INSERT INTO products (slug, name, category, image_url)
      VALUES (?, ?, ?, ?)
    `).run(slug, name, category, image_url);

    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "Slug already exists" });
  }
});
// ----- Admin: create seller -----
app.post("/admin/sellers", auth, (req, res) => {
  const { name, is_authorised = 0, base_url, score = 50, notes = "" } = req.body || {};

  if (!name || !base_url) {
    return res.status(400).json({ error: "name and base_url required" });
  }

  try {
    const info = db.prepare(`
      INSERT INTO sellers (name, is_authorised, base_url, score, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, is_authorised ? 1 : 0, base_url, score, notes);

    res.json({ id: info.lastInsertRowid });
  } catch {
    res.status(400).json({ error: "Seller already exists" });
  }
});

// ----- Admin: create/update offer for (product_id, seller_id) -----
app.post("/admin/offers", auth, (req, res) => {
  const { product_id, seller_id, price_inr, warranty_type, return_days = 0, product_url } = req.body || {};

  if (!product_id || !seller_id || !Number.isInteger(price_inr) || !warranty_type || !product_url) {
    return res.status(400).json({
      error: "product_id, seller_id, integer price_inr, warranty_type, product_url required"
    });
  }

  db.prepare(`
    INSERT INTO offers (product_id, seller_id, price_inr, warranty_type, return_days, product_url, last_checked_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(product_id, seller_id) DO UPDATE SET
      price_inr=excluded.price_inr,
      warranty_type=excluded.warranty_type,
      return_days=excluded.return_days,
      product_url=excluded.product_url,
      last_checked_at=datetime('now')
  `).run(product_id, seller_id, price_inr, warranty_type, return_days, product_url);

  res.json({ ok: true });
});

// ----- Admin: list sellers (for convenience) -----
app.get("/admin/sellers", auth, (req, res) => {
  const rows = db.prepare("SELECT * FROM sellers ORDER BY is_authorised DESC, score DESC").all();
  res.json(rows);
});
// ----- Admin: list offers (with product & seller names) -----
app.get("/admin/offers", auth, (req, res) => {
  const rows = db.prepare(`
    SELECT 
      o.*,
      p.name AS product_name, p.slug AS product_slug,
      s.name AS seller_name
    FROM offers o
    JOIN products p ON p.id = o.product_id
    JOIN sellers s ON s.id = o.seller_id
    ORDER BY o.last_checked_at DESC
  `).all();
  res.json(rows);
});

// ----- Admin: update offer by id -----
app.put("/admin/offers/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  const { price_inr, warranty_type, return_days, product_url } = req.body || {};

  if (!id) return res.status(400).json({ error: "Bad id" });

  const existing = db.prepare("SELECT id FROM offers WHERE id=?").get(id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  if (!price_inr || !product_url || !warranty_type) {
    return res.status(400).json({ error: "price_inr, warranty_type, product_url required" });
  }

  db.prepare(`
    UPDATE offers
    SET price_inr=?,
        warranty_type=?,
        return_days=?,
        product_url=?,
        last_checked_at=datetime('now')
    WHERE id=?
  `).run(Number(price_inr), String(warranty_type), Number(return_days || 0), String(product_url), id);

  res.json({ ok: true });
});

// ----- Admin: delete offer by id -----
app.delete("/admin/offers/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Bad id" });

  const info = db.prepare("DELETE FROM offers WHERE id=?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });

  res.json({ ok: true });
});


app.listen(4000, () => {
  console.log("API running on http://localhost:4000");
});
