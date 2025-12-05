# Discord Bot - SnowWhite Moderator

Discord Bot สำหรับช่วยในการดูแลและจัดการเซิร์ฟเวอร์

## Installation

```bash
npm install
```

## Configuration

สร้างไฟล์ `.env` และเพิ่มตัวแปรต่อไปนี้:

```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

## Running

```bash
npm start
```

สำหรับ Development mode:

```bash
npm run dev
```

## Features

- Moderation commands
- Auto-moderation
- Logging system

## Project Structure

```
.
├── src/
│   ├── index.js (Entry point)
│   ├── commands/ (Bot commands)
│   └── events/ (Discord events)
├── .env (Environment variables)
├── .gitignore
├── package.json
└── README.md
```
