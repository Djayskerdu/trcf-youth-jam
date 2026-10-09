// Vercel serverless function: gives social sites (Messenger, Facebook, WhatsApp...) a preview
// with the image and details of a specific event, announcement or verse.
// Share links look like:  /api/share?t=event&id=EVENT_ID   /api/share?t=news&id=NEWS_ID   /api/share?t=verse&d=2026-10-01
const verses = require("./verses.json");
let cfg;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

async function getCfg(host) {
  if (cfg) return cfg;
  const t = await (await fetch("https://" + host + "/config.js")).text();
  cfg = { url: t.match(/url:\s*"([^"]+)"/)[1], key: t.match(/key:\s*"([^"]+)"/)[1] };
  return cfg;
}

async function row(c, table, id) {
  const r = await fetch(c.url + "/rest/v1/" + table + "?id=eq." + encodeURIComponent(id) + "&select=data", {
    headers: { apikey: c.key },
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error("lookup failed: " + JSON.stringify(j));
  return j[0] && j[0].data;
}

module.exports = async (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = "https://" + host;
  const q = req.query || {};
  const t = String(q.t || "");
  let title = "TRCF Youth Jam";
  let desc = "Connect. Grow. Serve. Make Disciples. The youth ministry of The Redeemed Christian Fellowship.";
  let image = origin + "/og-image.jpg";
  let dest = "/";

  try {
    if (t === "event" && q.id) {
      const c = await getCfg(host);
      const e = await row(c, "events", q.id);
      if (e) {
        title = e.t;
        desc = [e.d, e.tm, e.loc].filter(Boolean).join(" · ") + (e.desc ? " — " + e.desc : "");
        if (e.aid) image = c.url + "/storage/v1/object/public/media/" + e.aid;
        dest = "/#events";
      }
    } else if (t === "news" && q.id) {
      const c = await getCfg(host);
      const n = await row(c, "news", q.id);
      if (n) {
        title = n.t;
        desc = (n.d ? n.d + " — " : "") + (n.x || "");
        dest = "/#news";
      }
    } else if (t === "verse") {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(String(q.d || "")) ? q.d : new Date().toISOString().slice(0, 10);
      const v = verses.find((x) => x[0] === d) || verses[Math.floor(new Date(d) / 864e5) % verses.length];
      title = "Verse of the Day · " + v[2];
      desc = "“" + v[1] + "” — " + v[2];
      dest = "/#/daily-verse";
    }
  } catch (err) {
    console.error("share preview fallback:", err && err.message);
  }

  title = clip(title, 90);
  desc = clip(desc, 280);
  const url = origin + (req.url || "/");
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TRCF Youth Jam">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(dest)}">
<script>location.replace(${JSON.stringify(dest)})</script>
</head><body style="font-family:sans-serif;background:#000;color:#fff"><p><a style="color:#8fa3ff" href="${esc(dest)}">Continue to TRCF Youth Jam</a></p></body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.status(200).send(html);
};
