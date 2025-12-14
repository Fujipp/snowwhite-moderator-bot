const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const configManager = require('../utils/configManager');
const { isAuthorized } = require('../utils/permissions');

const CREDIT_PATH = 'features.creditReply';

async function getLatestUserMessage(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.find((m) => !m.author?.bot) || null;
}

async function applyLatestActions(channel, latestMessage, creditConfig, client) {
  if (!latestMessage) return { reacted: false, replied: false };

  const reactions = Array.isArray(creditConfig.reactions) ? creditConfig.reactions : [];
  let reacted = false;
  for (const emoji of reactions) {
    await latestMessage.react(emoji).catch(() => {});
    reacted = true;
  }

  const replyMessage = (creditConfig.replyMessage || '').trim();
  let reply = null;
  if (replyMessage) {
    if (creditConfig.deleteOldReply && creditConfig.lastBotMessageId) {
      await channel.messages
        .fetch(creditConfig.lastBotMessageId)
        .then((m) => {
          if (m?.author?.id === client.user.id) {
            return m.delete().catch(() => {});
          }
        })
        .catch(() => {});
    }

    reply = await latestMessage.reply({ content: replyMessage }).catch(() => null);
    if (reply) {
      configManager.set(`${CREDIT_PATH}.lastBotMessageId`, reply.id);
    }
  }

  return { reacted: reacted && reactions.length > 0, replied: Boolean(reply) };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recredit')
    .setDescription('Refresh credit reply/reactions without changing the counter'),

  async execute(interaction) {
    if (!isAuthorized(interaction.member)) {
      return interaction.reply({ content: '❌ You are not allowed to use this command.', flags: MessageFlags.Ephemeral });
    }

    const credit = configManager.get(CREDIT_PATH) || {};
    if (!credit.channelId) {
      return interaction.reply({ content: '❌ Credit channel not configured.', flags: MessageFlags.Ephemeral });
    }

    const channel = await interaction.client.channels.fetch(credit.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({ content: '❌ Configured credit channel is invalid.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const latestUserMessage = await getLatestUserMessage(channel);

    const currentCount = Number(credit.messageCount || 0);
    const targetName = `┣・⭐ㆍcredit｜${currentCount}`;
    if (channel.name !== targetName) {
      await channel.setName(targetName).catch(() => {});
    }

    const actionResult = await applyLatestActions(channel, latestUserMessage, credit, interaction.client);

    const lines = [
      `📊 Current messageCount remains: \`${currentCount}\``,
      actionResult.reacted ? '✅ Reactions applied to the latest message.' : 'ℹ️ No reactions applied.',
      actionResult.replied ? '✅ Reply sent to the latest message.' : 'ℹ️ No reply sent.'
    ];

    if (!latestUserMessage) {
      lines.push('ℹ️ No user messages found to react or reply to.');
    }

    await interaction.editReply({ content: lines.join('\n') });
  }
};
