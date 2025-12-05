const { Events, MessageFlags } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`Command not found: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Error executing command:', error);
      
      try {
        // Check if interaction has been responded to
        if (interaction.replied) {
          await interaction.followUp({ 
            content: '❌ There was an error executing this command!',
            flags: MessageFlags.Ephemeral
          });
        } else if (interaction.deferred) {
          await interaction.editReply({ 
            content: '❌ There was an error executing this command!'
          });
        } else {
          await interaction.reply({ 
            content: '❌ There was an error executing this command!',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  }
};
