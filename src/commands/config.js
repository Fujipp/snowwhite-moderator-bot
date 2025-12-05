const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const configManager = require('../utils/configManager');
const { isAuthorized } = require('../utils/permissions');

const CREDIT_PATH = 'features.creditReply';
const PERMS_PATH = 'permissions';

const COLOR_BG = '#111827';
const COLOR_ACCENT = '#0EA5E9';
const COLOR_WARN = '#F59E0B';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function getConfig() {
  return {
    credit: configManager.get(CREDIT_PATH) || {},
    perms: configManager.get(PERMS_PATH) || { allowedRoles: [], allowedUsers: [] }
  };
}

function buildEmbed(view = 'home') {
  const { credit, perms } = getConfig();
  const embed = new EmbedBuilder().setColor(COLOR_BG).setTimestamp();

  if (view === 'home') {
    embed
      .setTitle('⚙️ SnowWhite Config')
      .setDescription('เลือกส่วนที่ต้องการตั้งค่า')
      .addFields({
        name: '💳 Credit Reply',
        value: 'จัดการการตอบกลับ, ปฏิกิริยา, บทบาท, และตัวนับข้อความ',
        inline: false
      })
      .addFields({
        name: '🔐 Access Control',
        value: 'กำหนด Role/User ที่ใช้คำสั่งได้',
        inline: false
      });
    return embed;
  }

  // credit view
  embed
    .setTitle('💳 Credit Reply Settings')
    .setDescription('ปรับค่าด้านล่าง การเปลี่ยนแปลงมีผลทันที')
    .addFields(
      {
        name: 'สถานะ',
        value: `${credit.enabled ? '🟢 ON' : '🔴 OFF'}`,
        inline: true
      },
      {
        name: 'ห้อง',
        value: credit.channelId ? `<#${credit.channelId}>` : '`Not set`',
        inline: true
      },
      {
        name: 'Count',
        value: `\`${credit.messageCount ?? 0}\``,
        inline: true
      },
      {
        name: 'Role ให้',
        value: credit.defaultRoleId ? `<@&${credit.defaultRoleId}>` : '`None`',
        inline: true
      },
      {
        name: 'Delete old reply',
        value: credit.deleteOldReply ? '✅ Yes' : '❌ No',
        inline: true
      },
      {
        name: 'Reactions',
        value: asList(credit.reactions).join(' ') || '`None`',
        inline: false
      },
      {
        name: 'Reply message',
        value: credit.replyMessage ? credit.replyMessage : '`None`',
        inline: false
      },
      {
        name: 'Access',
        value: [
          `Roles: ${
            asList(perms.allowedRoles).length
              ? asList(perms.allowedRoles).map((id) => `<@&${id}>`).join(', ')
              : '`None`'
          }`,
          `Users: ${
            asList(perms.allowedUsers).length
              ? asList(perms.allowedUsers).map((id) => `<@${id}>`).join(', ')
              : '`None`'
          }`
        ].join('\n'),
        inline: false
      }
    );

  return embed;
}

function buildRows(view = 'home') {
  const { credit } = getConfig();
  const rows = [];

  if (view === 'home') {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('config_nav_credit')
          .setLabel('💳 Credit Settings')
          .setStyle(ButtonStyle.Primary)
      )
    );
    return rows;
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('config_toggle_credit')
        .setLabel(credit.enabled ? '🔴 Disable Credit' : '🟢 Enable Credit')
        .setStyle(credit.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('config_set_channel')
        .setLabel('💬 Set Channel')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('config_set_role')
        .setLabel('🎖️ Set Role')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('config_set_reply')
        .setLabel('💌 Reply Text')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('config_toggle_delete')
        .setLabel(credit.deleteOldReply ? '🗑️ Delete Old: ON' : '🗑️ Delete Old: OFF')
        .setStyle(credit.deleteOldReply ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  );

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('config_add_reaction')
        .setLabel('✨ Add Reaction')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('config_remove_reaction')
        .setLabel('🧹 Remove Reaction')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('config_set_count')
        .setLabel('🔢 Set Count')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('config_clear_reply')
        .setLabel('🧽 Clear Reply')
        .setStyle(ButtonStyle.Secondary)
    )
  );

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('config_add_role_access')
        .setLabel('➕ Allow Role')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('config_add_user_access')
        .setLabel('➕ Allow User')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('config_view_access')
        .setLabel('👁️ View Access')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('config_nav_home')
        .setLabel('↩️ Back')
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return rows;
}

function modalBuilder(customId, title, fieldId, label, placeholder = '', required = true, style = TextInputStyle.Short) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(fieldId)
          .setLabel(label)
          .setPlaceholder(placeholder)
          .setStyle(style)
          .setRequired(required)
      )
    );
}

function ensureAuthorized(interaction) {
  if (!isAuthorized(interaction.member)) {
    throw new Error('NOT_AUTHORIZED');
  }
}

async function refresh(interaction, view = 'credit') {
  const embed = buildEmbed(view);
  const components = buildRows(view);

  if (interaction.isButton?.() || interaction.isModalSubmit?.()) {
    return interaction.update ? interaction.update({ embeds: [embed], components, ephemeral: true }) : null;
  }

  return interaction.editReply({ embeds: [embed], components });
}

async function editExistingPanel(interaction, view = 'credit') {
  const embed = buildEmbed(view);
  const components = buildRows(view);
  if (interaction.message) {
    await interaction.message.edit({ embeds: [embed], components }).catch(() => {});
  }
}

function replyWithPanel(interaction, content) {
  const embed = buildEmbed('credit');
  const components = buildRows('credit');
  return interaction.reply({
    content,
    embeds: [embed],
    components,
    ephemeral: true
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Open the interactive config panel'),

  async execute(interaction) {
    try {
      ensureAuthorized(interaction);
    } catch (err) {
      if (err.message === 'NOT_AUTHORIZED') {
        return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });
      }
      throw err;
    }

    const embed = buildEmbed();
    const components = buildRows('home');
    await interaction.reply({ embeds: [embed], components, ephemeral: true });
  },

  async handleButton(interaction) {
    try {
      ensureAuthorized(interaction);
    } catch (err) {
      if (err.message === 'NOT_AUTHORIZED') {
        return interaction.reply({ content: '❌ You are not allowed to use this.', ephemeral: true });
      }
      throw err;
    }

    const id = interaction.customId;
    const creditPath = CREDIT_PATH;
    const permsPath = PERMS_PATH;
    const { credit, perms } = getConfig();

    switch (id) {
      case 'config_nav_credit': {
        return refresh(interaction, 'credit');
      }
      case 'config_nav_home': {
        return refresh(interaction, 'home');
      }
      case 'config_toggle_credit': {
        configManager.set(`${creditPath}.enabled`, !credit.enabled);
        return refresh(interaction, 'credit');
      }
      case 'config_set_channel': {
        const modal = modalBuilder('modal_set_channel', 'Set Channel ID', 'channel', 'Channel ID', '123456789012345678');
        return interaction.showModal(modal);
      }
      case 'config_set_role': {
        const modal = modalBuilder('modal_set_role', 'Set Role ID', 'role', 'Role ID', '123456789012345678');
        return interaction.showModal(modal);
      }
      case 'config_set_reply': {
        const modal = modalBuilder(
          'modal_set_reply',
          'Set Reply Message',
          'reply',
          'Reply Message',
          'Thank you for your support!',
          false,
          TextInputStyle.Paragraph
        );
        return interaction.showModal(modal);
      }
      case 'config_add_reaction': {
        const modal = modalBuilder('modal_add_reaction', 'Add Reaction Emoji', 'emoji', 'Emoji', '<:example:123>', true);
        return interaction.showModal(modal);
      }
      case 'config_remove_reaction': {
        const modal = modalBuilder('modal_remove_reaction', 'Remove Reaction Emoji', 'emoji', 'Emoji to remove', '<:example:123>', true);
        return interaction.showModal(modal);
      }
      case 'config_toggle_delete': {
        configManager.set(`${creditPath}.deleteOldReply`, !credit.deleteOldReply);
        return refresh(interaction, 'credit');
      }
      case 'config_set_count': {
        const modal = modalBuilder('modal_set_count', 'Set Message Count', 'count', 'Message Count', '0');
        return interaction.showModal(modal);
      }
      case 'config_clear_reply': {
        configManager.set(`${creditPath}.replyMessage`, '');
        return refresh(interaction, 'credit');
      }
      case 'config_add_role_access': {
        const modal = modalBuilder('modal_add_role_access', 'Allow Role ID', 'role', 'Role ID', '123456789012345678');
        return interaction.showModal(modal);
      }
      case 'config_add_user_access': {
        const modal = modalBuilder('modal_add_user_access', 'Allow User ID', 'user', 'User ID', '123456789012345678');
        return interaction.showModal(modal);
      }
      case 'config_view_access': {
        return refresh(interaction, 'credit');
      }
      default:
        return interaction.reply({ content: 'Unknown action.', ephemeral: true });
    }
  },

  async handleModal(interaction) {
    try {
      ensureAuthorized(interaction);
    } catch (err) {
      if (err.message === 'NOT_AUTHORIZED') {
        return interaction.reply({ content: '❌ You are not allowed to use this.', ephemeral: true });
      }
      throw err;
    }

    const id = interaction.customId;
    const creditPath = CREDIT_PATH;
    const permsPath = PERMS_PATH;

    if (id === 'modal_set_channel') {
      const value = interaction.fields.getTextInputValue('channel');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid channel ID.', ephemeral: true });
      }
      await interaction.deferUpdate();
      await configManager.set(`${creditPath}.channelId`, value);
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_set_role') {
      const value = interaction.fields.getTextInputValue('role');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid role ID.', ephemeral: true });
      }
      await interaction.deferUpdate();
      await configManager.set(`${creditPath}.defaultRoleId`, value);
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_set_reply') {
      const value = interaction.fields.getTextInputValue('reply');
      await interaction.deferUpdate();
      await configManager.set(`${creditPath}.replyMessage`, value);
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_add_reaction') {
      const emoji = interaction.fields.getTextInputValue('emoji');
      const current = asList(configManager.get(`${creditPath}.reactions`));
      if (!current.includes(emoji)) current.push(emoji);
      await interaction.deferUpdate();
      await configManager.set(`${creditPath}.reactions`, current);
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_remove_reaction') {
      const emoji = interaction.fields.getTextInputValue('emoji');
      const current = asList(configManager.get(`${creditPath}.reactions`)).filter((e) => e !== emoji);
      await interaction.deferUpdate();
      await configManager.set(`${creditPath}.reactions`, current);
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_set_count') {
      const value = interaction.fields.getTextInputValue('count');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Count must be a number.', ephemeral: true });
      }
      await interaction.deferUpdate();
      await configManager.set(`${creditPath}.messageCount`, Number(value));
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_add_role_access') {
      const value = interaction.fields.getTextInputValue('role');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid role ID.', ephemeral: true });
      }
      const list = asList(configManager.get(`${permsPath}.allowedRoles`));
      if (!list.includes(value)) list.push(value);
      await interaction.deferUpdate();
      await configManager.set(`${permsPath}.allowedRoles`, list);
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_add_user_access') {
      const value = interaction.fields.getTextInputValue('user');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid user ID.', ephemeral: true });
      }
      const list = asList(configManager.get(`${permsPath}.allowedUsers`));
      if (!list.includes(value)) list.push(value);
      await interaction.deferUpdate();
      await configManager.set(`${permsPath}.allowedUsers`, list);
      await editExistingPanel(interaction);
      return;
    }

    return interaction.reply({ content: 'Unknown modal.', ephemeral: true });
  }
};
