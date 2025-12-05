const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`\n✅ Logged in as ${client.user.tag}`);
    console.log(`🤖 Bot is online and ready!`);
    console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
    
    // Set bot status
    try {
      await client.user.setActivity('/ping - Moderator Bot', { type: 'LISTENING' });
    } catch (error) {
      console.error('Error setting activity:', error);
    }
  }
};
