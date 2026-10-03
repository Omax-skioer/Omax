import express from 'express';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { config } from './src/config.js';
import { handleCommand } from './src/commands.js';

const app = express();
let latestQR = null;
let latestPairing = null;
let connected = false;
let stateRef = null;
let sockRef = null;

app.get('/', async (_req, res) => {
  const qr = latestQR ? await QRCode.toDataURL(latestQR) : null;
  res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Omax Bot</title><style>body{font-family:Arial;text-align:center;padding:24px;background:#10131a;color:#fff}img{max-width:280px;background:#fff;padding:12px;border-radius:12px}.card{max-width:520px;margin:auto;padding:22px;border-radius:18px;background:#1a1f2b}code{font-size:28px;letter-spacing:5px}</style></head><body><div class="card"><h1>🤖 Omax WhatsApp Bot</h1><p>Status: <b>${connected ? '🟢 Online' : '🟡 Waiting'}</b></p>${qr ? `<img src="${qr}"/><p>Scan this QR from WhatsApp → Linked devices.</p>` : '<p>QR not available yet.</p>'}${latestPairing ? `<p>Pairing code:</p><code>${latestPairing}</code>` : ''}<p>Use /api/pairing to request a pairing code.</p></div></body></html>`);
});
app.get('/health', (_req, res) => res.json({ ok: true, connected, bot: config.botName }));
app.get('/api/status', (_req, res) => res.json({ connected, qrAvailable: Boolean(latestQR), pairingAvailable: Boolean(latestPairing), bot: config.botName }));
app.get('/qr', async (_req, res) => latestQR ? res.type('png').send(await QRCode.toBuffer(latestQR)) : res.status(404).send('QR not ready'));
app.get('/api/pairing', async (_req, res) => {
  if (!sockRef || !stateRef) return res.status(503).json({ ok: false, error: 'Bot is starting. Try again in a few seconds.' });
  if (stateRef.creds.registered) return res.json({ ok: false, error: 'WhatsApp is already linked. Unlink it first if you want a new pairing code.' });
  try {
    const code = await sockRef.requestPairingCode(config.pairingNumber.replace(/\D/g, ''));
    latestPairing = code;
    latestQR = null;
    res.json({ ok: true, pairingCode: code });
  } catch (e) { res.status(500).json({ ok: false, error: String(e?.message || e) }); }
});

app.listen(config.port, '0.0.0.0', () => console.log(`Omax dashboard listening on ${config.port}`));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  stateRef = state;
  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: Browsers.ubuntu('Chrome'), markOnlineOnConnect: false, generateHighQualityLinkPreview: false });
  sockRef = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) { latestQR = qr; latestPairing = null; }
    if (connection === 'open') { connected = true; latestQR = null; latestPairing = null; console.log('Omax connected.'); }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
      else console.log('Logged out. Delete auth and link again.');
    }
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages?.[0];
    if (!msg?.message || msg.key.fromMe) return;
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!body.startsWith(config.prefix)) {
      if (config.autoReply && body.trim().toLowerCase() === 'hi') await sock.sendMessage(msg.key.remoteJid, { text: `👋 Hi! I'm ${config.botName}. Type ${config.prefix}menu` }, { quoted: msg });
      return;
    }
    const parts = body.slice(config.prefix.length).trim().split(/\s+/);
    const command = parts.shift();
    try { await handleCommand(sock, msg, command, parts); } catch (e) { console.error('Command error:', e); }
  });
}
startBot();
