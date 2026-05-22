import { Telegraf } from 'telegraf';
import { connectDB, disconnectDB } from './db.js';
import { setupBotHandlers } from './bot.js';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  throw new Error('❌ BOT_TOKEN is not set in environment variables');
}

const bot = new Telegraf(BOT_TOKEN);

// Connect to database
await connectDB();

// Setup bot handlers
setupBotHandlers(bot);

// Error handling
bot.catch((err, ctx) => {
  console.error(`❌ Bot error for ${ctx.updateType}:`, err);
});

// Graceful shutdown
process.once('SIGINT', async () => {
  console.log('🛑 SIGINT signal received: closing HTTP server');
  bot.stop('SIGINT');
  await disconnectDB();
});

process.once('SIGTERM', async () => {
  console.log('🛑 SIGTERM signal received: closing HTTP server');
  bot.stop('SIGTERM');
  await disconnectDB();
});

// Start bot
(async () => {
  try {
    if (WEBHOOK_URL) {
      // Webhook mode for production (Render)
      console.log('🌐 Starting bot in webhook mode...');
      await bot.launch({
        webhook: {
          domain: WEBHOOK_URL,
          port: PORT,
          path: `/bot${BOT_TOKEN}`,
        },
      });
      console.log(`✅ Bot is running in webhook mode on port ${PORT}`);
    } else {
      // Polling mode for local development
      console.log('📡 Starting bot in polling mode...');
      await bot.launch();
      console.log('✅ Bot is running in polling mode');
    }
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    await disconnectDB();
    process.exit(1);
  }
})();