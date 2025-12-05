const { Events, MessageFlags } = require('discord.js');
const configCommand = require('../commands/config');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      // 1) Slash Command
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId.startsWith('config_')) {
          await configCommand.handleButton(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('modal_')) {
          await configCommand.handleModal(interaction);
        }
        return;
      }

    } catch (error) {
      console.error('Error executing command:', error);

      const payload = {
        content: '❌ There was an error executing this action!',
        flags: MessageFlags.Ephemeral
      };

      // กัน 40060
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
};
