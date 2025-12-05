const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responds with Pong!'),
  
  async execute(interaction) {
    const latency = Math.round(interaction.client.ws.ping);
    await interaction.reply(`🏓 Pong! Bot latency is ${latency}ms`);
  }
};
