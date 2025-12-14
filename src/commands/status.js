const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const configManager = require('../utils/configManager');
const { isAuthorized } = require('../utils/permissions');

const STATUS_PATH = 'features.status';
const STATUS_STATES = ['open', 'busy', 'close'];

function ensureAuthorized(interaction) {
  if (!isAuthorized(interaction.member)) {
    throw new Error('NOT_AUTHORIZED');
  }
}

function buildStatusEmbed(stateKey, statusConfig) {
  const state = statusConfig.states?.[stateKey];
  if (!state) return null;

  const embed = new EmbedBuilder().setColor(statusConfig.color || 15727871).setTitle(state.title || 'STATUS');

  if (state.thumbnail) embed.setThumbnail(state.thumbnail);
  if (state.image) embed.setImage(state.image);
  if (state.fieldName || state.fieldValue) {
    embed.setFields({
      name: state.fieldName || 'Info',
      value: state.fieldValue || '`No content`',
      inline: false
    });
  }

  return embed;
}

async function editStatusMessage(client, stateKey, statusConfig) {
  const channelId = statusConfig.channelId;
  const messageId = statusConfig.messageId;
  if (!channelId) throw new Error('MISSING_TARGET');

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) throw new Error('INVALID_CHANNEL');

  const embed = buildStatusEmbed(stateKey, statusConfig);
  if (!embed) throw new Error('INVALID_STATE');

  let targetMessage = null;

  if (messageId) {
    targetMessage = await channel.messages.fetch(messageId).catch(() => null);
  }

  if (!targetMessage) {
    targetMessage = await channel.send({ embeds: [embed] });
    configManager.set(`${STATUS_PATH}.messageId`, targetMessage.id);
  } else {
    await targetMessage.edit({ embeds: [embed] });
  }

  const channelNames = statusConfig.channelNames || {};
  const desiredName = channelNames[stateKey];
  if (desiredName && typeof channel.setName === 'function' && channel.name !== desiredName) {
    await channel.setName(desiredName).catch(() => {});
  }

  configManager.set(`${STATUS_PATH}.current`, stateKey);
  return { channel, message: targetMessage };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Set shop status')
    .addStringOption((opt) =>
      opt
        .setName('state')
        .setDescription('Status to set')
        .setRequired(true)
        .addChoices(
          { name: 'Open', value: 'open' },
          { name: 'Busy', value: 'busy' },
          { name: 'Close', value: 'close' }
        )
    ),

  async execute(interaction) {
    try {
      ensureAuthorized(interaction);
    } catch (err) {
      if (err.message === 'NOT_AUTHORIZED') {
        return interaction.reply({ content: '❌ You are not allowed to use this command.', flags: MessageFlags.Ephemeral });
      }
      throw err;
    }

    const state = interaction.options.getString('state');
    const statusConfig = configManager.get(STATUS_PATH) || {};
    if (!STATUS_STATES.includes(state)) {
      return interaction.reply({ content: '❌ Invalid state.', flags: MessageFlags.Ephemeral });
    }

    try {
      await editStatusMessage(interaction.client, state, statusConfig);
      await interaction.reply({
        content: `✅ Status set to **${state.toUpperCase()}**.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      let message = '❌ Failed to update status.';
      if (error.message === 'MISSING_TARGET') message = '❌ Please set channel/message ID in config.';
      if (error.message === 'INVALID_CHANNEL') message = '❌ Configured channel is invalid.';
      if (error.message === 'MISSING_MESSAGE') message = '❌ Target message not found.';
      if (error.message === 'INVALID_STATE') message = '❌ Status template missing.';
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  }
};
