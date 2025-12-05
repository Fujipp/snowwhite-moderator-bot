const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responds with Pong!'),
  
  async execute(interaction) {
    try {
      const latency = Math.round(interaction.client.ws.ping);
      await interaction.reply({ 
        content: `🏓 Pong! Bot latency is ${latency}ms`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('Error in ping command:', error);
      throw error;
    }
  }
};
