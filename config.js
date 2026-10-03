import 'dotenv/config';

export const config = {
  botName: process.env.BOT_NAME || 'Omax',
  prefix: process.env.PREFIX || '.',
  ownerName: process.env.OWNER_NAME || 'Shehara Kavindha',
  ownerNumber: process.env.OWNER_NUMBER || '94775113277',
  pairingNumber: process.env.PAIRING_NUMBER || process.env.OWNER_NUMBER || '94775113277',
  autoReply: (process.env.AUTO_REPLY || 'true').toLowerCase() === 'true',
  port: Number(process.env.PORT || 3000),
  authDir: process.env.AUTH_DIR || './auth'
};
