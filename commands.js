import sharp from 'sharp';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { config } from './config.js';

const text = (x) => x?.message?.conversation || x?.message?.extendedTextMessage?.text || '';
const mentioned = (x) => x?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
const sender = (x) => x?.key?.participant || x?.key?.remoteJid || '';
const isGroup = (jid) => jid?.endsWith('@g.us');

export function menu() {
  return `╭━━━〔 ${config.botName} 〕━━━╮
┃ 🤖 WhatsApp Bot
┃
┃ BASIC
┃ ${config.prefix}menu • ${config.prefix}help
┃ ${config.prefix}ping • ${config.prefix}alive
┃ ${config.prefix}owner • ${config.prefix}about
┃
┃ FUN
┃ ${config.prefix}joke • ${config.prefix}quote
┃ ${config.prefix}fact • ${config.prefix}8ball
┃ ${config.prefix}coin • ${config.prefix}dice
┃
┃ MEDIA
┃ ${config.prefix}sticker • ${config.prefix}toimg
┃ ${config.prefix}caption • ${config.prefix}blur
┃ ${config.prefix}resize
┃
┃ GROUP
┃ ${config.prefix}groupinfo • ${config.prefix}admins
┃ ${config.prefix}tagall • ${config.prefix}everyone
┃ ${config.prefix}antilink • ${config.prefix}welcome
┃
┃ ADMIN
┃ ${config.prefix}kick • ${config.prefix}promote
┃ ${config.prefix}demote • ${config.prefix}mute
┃ ${config.prefix}setwelcome • ${config.prefix}setprefix
┃
┃ OMAX
┃ ${config.prefix}omax • ${config.prefix}shehara
┃ ${config.prefix}support • ${config.prefix}status
┃ ${config.prefix}repo
╰━━━━━━━━━━━━━━━━━━╯`;
}

export async function handleCommand(sock, msg, command, args) {
  const jid = msg.key.remoteJid;
  const cmd = command.toLowerCase();
  const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

  switch (cmd) {
    case 'menu': case 'help': return reply(menu());
    case 'ping': return reply('🏓 Pong! Omax is online.');
    case 'alive': return reply(`🟢 ${config.botName} is alive!`);
    case 'owner': return reply(`👤 ${config.ownerName}\n📱 wa.me/${config.ownerNumber}`);
    case 'about': return reply(`🤖 ${config.botName}\n⚡ Prefix: ${config.prefix}\n🌐 Sinhala + English`);
    case 'joke': return reply('😂 Why did the computer go to the doctor? Because it had a virus!');
    case 'quote': return reply('💬 Small steps every day can lead to big results.');
    case 'fact': return reply('🧠 Honey never spoils when properly stored.');
    case '8ball': {
      const answers = ['Yes.', 'No.', 'Maybe.', 'Definitely!', 'Ask again later.'];
      return reply(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
    }
    case 'coin': return reply(`🪙 ${Math.random() < 0.5 ? 'Heads' : 'Tails'}`);
    case 'dice': return reply(`🎲 ${Math.floor(Math.random() * 6) + 1}`);
    case 'omax': return reply('🔥 Omax Bot\nBuilt for fun, groups and useful commands.');
    case 'shehara': return reply(`👑 ${config.ownerName}`);
    case 'support': return reply('🛠️ Omax support: use .menu to see available commands.');
    case 'status': return reply('🟢 Omax status: Online');
    case 'repo': return reply('📦 Repository link can be added later in the bot settings.');
    case 'groupinfo': {
      if (!isGroup(jid)) return reply('❌ Group command only.');
      const meta = await sock.groupMetadata(jid);
      return reply(`👥 ${meta.subject}\n👤 Members: ${meta.participants.length}\n🆔 ${jid}`);
    }
    case 'admins': {
      if (!isGroup(jid)) return reply('❌ Group command only.');
      const meta = await sock.groupMetadata(jid);
      const admins = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`);
      return sock.sendMessage(jid, { text: `👑 Group admins:\n${admins.join('\n')}`, mentions: meta.participants.filter(p => p.admin).map(p => p.id) }, { quoted: msg });
    }
    case 'tagall': case 'everyone': {
      if (!isGroup(jid)) return reply('❌ Group command only.');
      const meta = await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const body = args.join(' ') || '📢 Attention everyone!';
      return sock.sendMessage(jid, { text: `${body}\n\n${members.map(x => '@' + x.split('@')[0]).join(' ')}`, mentions: members }, { quoted: msg });
    }
    case 'kick': case 'promote': case 'demote': {
      if (!isGroup(jid)) return reply('❌ Group command only.');
      const targets = mentioned(msg);
      if (!targets.length) return reply(`❌ Mention a member to ${cmd}.`);
      const action = cmd === 'kick' ? 'remove' : cmd;
      try { await sock.groupParticipantsUpdate(jid, targets, action); return reply(`✅ ${cmd} completed.`); }
      catch { return reply('❌ Failed. Make sure the bot is a group admin.'); }
    }
    case 'mute': return reply('ℹ️ Individual member mute is not supported by WhatsApp. We can add group-mute settings later.');
    case 'antilink': return reply('🛡️ Anti-link setting placeholder. Full persistent settings can be added later.');
    case 'welcome': case 'setwelcome': case 'setprefix': return reply('⚙️ This setting is prepared for the next update.');
    case 'sticker': return mediaCommand(sock, msg, 'sticker');
    case 'toimg': return mediaCommand(sock, msg, 'image');
    case 'blur': return mediaCommand(sock, msg, 'blur');
    case 'resize': return mediaCommand(sock, msg, 'resize');
    case 'caption': return reply('✍️ Reply to an image with `.caption your text` to add a caption in a future media update.');
    default: return false;
  }
}

async function mediaCommand(sock, msg, type) {
  const jid = msg.key.remoteJid;
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const image = q?.imageMessage || msg.message?.imageMessage;
  if (!image) { await sock.sendMessage(jid, { text: '📷 Please send/reply to an image.' }, { quoted: msg }); return true; }
  try {
    const stream = await downloadContentFromMessage(image, 'image');
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    const input = Buffer.concat(chunks);
    if (type === 'sticker') {
      const out = await sharp(input).resize(512, 512, { fit: 'inside' }).webp().toBuffer();
      await sock.sendMessage(jid, { sticker: out }, { quoted: msg });
    } else if (type === 'blur') {
      const out = await sharp(input).blur(8).jpeg().toBuffer();
      await sock.sendMessage(jid, { image: out }, { quoted: msg });
    } else if (type === 'resize') {
      const out = await sharp(input).resize(800, 800, { fit: 'inside' }).jpeg().toBuffer();
      await sock.sendMessage(jid, { image: out }, { quoted: msg });
    } else {
      const out = await sharp(input).jpeg().toBuffer();
      await sock.sendMessage(jid, { image: out }, { quoted: msg });
    }
  } catch { await sock.sendMessage(jid, { text: '❌ Media processing failed.' }, { quoted: msg }); }
  return true;
}
