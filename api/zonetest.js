export default async function handler(req, res) {
  return res.json({ test: 'ok', ts: Date.now(), query: req.query });
}
