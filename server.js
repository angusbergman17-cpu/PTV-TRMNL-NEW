
import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import Parser from 'rss-parser';
import sharp from 'sharp';

const app = express();
const parser = new Parser();

/**
 * Basic middleware
 */
app.use(express.json());

/**
 * Health / root endpoint
 * REQUIRED so Render sees an open, responding service.
 */
app.get('/', async (req, res) => {
  res.status(200).send('✅ TRMNL Melbourne PT service is running');
});

/**
 * Optional sanity endpoint — proves key libs load correctly.
 * Safe to remove later.
 */
app.get('/_sanity', async (req, res) => {
  try {
    // axios check
    const axiosOk = typeof axios.get === 'function';

    // rss-parser check
    const parserOk = typeof parser.parseURL === 'function';

    // sharp check
    const sharpOk = typeof sharp === 'function';

    res.json({
      status: 'ok',
      axios: axiosOk,
      rssParser: parserOk,
      sharp: sharpOk
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * IMPORTANT:
 * Render provides PORT at runtime.
 * Hardcoding WILL break deployment.
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
