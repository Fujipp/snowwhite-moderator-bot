const { Events } = require('discord.js');
const configManager = require('../utils/configManager');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    const credit = configManager.get('features.creditReply') || {};
    if (!credit.enabled) return;
    if (!credit.channelId || message.channelId !== credit.channelId) return;

    // 1) Increment message count
    const nextCount = Number(credit.messageCount || 0) + 1;
    configManager.set('features.creditReply.messageCount', nextCount);

    // 2) React with configured emojis
    const reactions = Array.isArray(credit.reactions) && credit.reactions.length ? credit.reactions : [];
    for (const emoji of reactions) {
      message.react(emoji).catch(() => {});
    }

    // 3) Assign default role if set
    const roleId = credit.defaultRoleId;
    if (roleId && message.member && !message.member.roles.cache.has(roleId)) {
      const role = await message.guild.roles.fetch(roleId).catch(() => null);
      if (role) {
        await message.member.roles.add(role).catch(() => {});
      }
    }

    // 4) Rename channel to match counter
    const targetName = `┣・⭐︰credit｜${nextCount}`;
    if (message.channel.name !== targetName) {
      await message.channel.setName(targetName).catch(() => {});
    }

    // 5) Reply with configured message
    const replyMessage = (credit.replyMessage || '').trim();
    if (!replyMessage) return;

    // Delete old reply if requested
    if (credit.deleteOldReply && credit.lastBotMessageId) {
      await message.channel.messages
        .fetch(credit.lastBotMessageId)
        .then((m) => {
          if (m?.author?.id === message.client.user.id) {
            return m.delete().catch(() => {});
          }
        })
        .catch(() => {});
    }

    const botReply = await message.reply({ content: replyMessage }).catch(() => null);
    if (botReply) {
      configManager.set('features.creditReply.lastBotMessageId', botReply.id);
    }
  }
};
