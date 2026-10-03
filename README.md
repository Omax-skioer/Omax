# Omax WhatsApp Bot

A starter WhatsApp bot with QR and phone-number pairing support, designed for deployment on a Node/Render web service.

## Commands

Basic: `.menu` `.help` `.ping` `.alive` `.owner` `.about`

Fun: `.joke` `.quote` `.fact` `.8ball` `.coin` `.dice`

Media: `.sticker` `.toimg` `.caption` `.blur` `.resize`

Group: `.groupinfo` `.admins` `.tagall` `.everyone` `.antilink` `.welcome`

Admin: `.kick` `.promote` `.demote` `.mute` `.setwelcome` `.setprefix`

Omax: `.omax` `.shehara` `.support` `.status` `.repo`

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.
6. Link WhatsApp with the QR shown there, or use `/api/pairing` for a pairing code.

## Render

Upload this project to GitHub, then create a Render Web Service from the repository. Build command: `npm install`. Start command: `npm start`. The included `render.yaml` contains the basic settings.

For the free tier, treat this as a testing/starter deployment: restarts/sleep and ephemeral storage can require linking WhatsApp again. Do not commit the `auth` folder or `.env` file.

## Safety

Use the bot only for legitimate automation and avoid unsolicited bulk messaging or spam. Never share your QR or pairing code with anyone.
