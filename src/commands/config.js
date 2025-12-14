const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const configManager = require('../utils/configManager');
const { isAuthorized } = require('../utils/permissions');

const CREDIT_PATH = 'features.creditReply';
const PERMS_PATH = 'permissions';
const STATUS_PATH = 'features.status';

const COLOR_BG = '#111827';
const COLOR_ACCENT = '#0EA5E9';
const COLOR_WARN = '#F59E0B';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function getConfig() {
  return {
    credit: configManager.get(CREDIT_PATH) || {},
    perms: configManager.get(PERMS_PATH) || { allowedRoles: [], allowedUsers: [] },
    status: configManager.get(STATUS_PATH) || {}
  };
}

function buildEmbed(view = 'home') {
  const { credit, perms, status } = getConfig();
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
        name: '🪄 Status Banner',
        value: 'ตั้งค่าข้อความสถานะร้าน (open/busy/close)',
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
  if (view === 'credit') {
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

  // status view
  const current = status.current || 'open';
  embed
    .setTitle('🪄 Status Banner')
    .setDescription('ปรับค่าด้านล่าง การเปลี่ยนแปลงมีผลทันที')
    .addFields(
      {
        name: 'Target',
        value: [
          `Channel: ${status.channelId ? `<#${status.channelId}>` : '`Not set`'}`,
          `Message: ${status.messageId ? `\`${status.messageId}\`` : '`Not set`'}`,
          `Current: \`${current}\``
        ].join('\n'),
        inline: false
      },
      {
        name: 'Template: OPEN',
        value: [
          `Title: ${status.states?.open?.title || '`None`'}`,
          `Thumb: ${status.states?.open?.thumbnail ? '✅' : '❌'}`,
          `Image: ${status.states?.open?.image ? '✅' : '❌'}`,
          `Field: ${status.states?.open?.fieldName ? status.states.open.fieldName : '`None`'}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Template: BUSY',
        value: [
          `Title: ${status.states?.busy?.title || '`None`'}`,
          `Thumb: ${status.states?.busy?.thumbnail ? '✅' : '❌'}`,
          `Image: ${status.states?.busy?.image ? '✅' : '❌'}`,
          `Field: ${status.states?.busy?.fieldName ? status.states.busy.fieldName : '`None`'}`
        ].join('\n'),
        inline: false
      },
      {
        name: 'Template: CLOSE',
        value: [
          `Title: ${status.states?.close?.title || '`None`'}`,
          `Thumb: ${status.states?.close?.thumbnail ? '✅' : '❌'}`,
          `Image: ${status.states?.close?.image ? '✅' : '❌'}`,
          `Field: ${status.states?.close?.fieldName ? status.states.close.fieldName : '`None`'}`
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
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('config_nav_status')
          .setLabel('🪄 Status Settings')
          .setStyle(ButtonStyle.Primary)
      )
    );
    return rows;
  }

  if (view === 'status') {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_status_set_channel').setLabel('💬 Set Channel').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_status_set_message').setLabel('🧾 Set Message ID').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_nav_home').setLabel('↩️ Back').setStyle(ButtonStyle.Secondary)
      )
    );

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_status_text_open').setLabel('✏️ OPEN Text').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_status_text_busy').setLabel('✏️ BUSY Text').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('config_status_text_close').setLabel('✏️ CLOSE Text').setStyle(ButtonStyle.Secondary)
      )
    );

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_status_media_open').setLabel('🖼️ OPEN Media').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_status_media_busy').setLabel('🖼️ BUSY Media').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_status_media_close').setLabel('🖼️ CLOSE Media').setStyle(ButtonStyle.Primary)
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

function modalBuilder(customId, title, fieldId, label, placeholder = '', required = true, style = TextInputStyle.Short, value = '') {
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
          .setValue(value || '')
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
    return interaction.update ? interaction.update({ embeds: [embed], components }) : null;
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
    flags: MessageFlags.Ephemeral
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
        return interaction.reply({ content: '❌ You are not allowed to use this command.', flags: MessageFlags.Ephemeral });
      }
      throw err;
    }

    const embed = buildEmbed();
    const components = buildRows('home');
    await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
  },

  async handleButton(interaction) {
    try {
      ensureAuthorized(interaction);
    } catch (err) {
      if (err.message === 'NOT_AUTHORIZED') {
        return interaction.reply({ content: '❌ You are not allowed to use this.', flags: MessageFlags.Ephemeral });
      }
      throw err;
    }

    const id = interaction.customId;
    const creditPath = CREDIT_PATH;
    const permsPath = PERMS_PATH;
    const statusPath = STATUS_PATH;
    const { credit, perms } = getConfig();

    switch (id) {
      case 'config_nav_credit': {
        return refresh(interaction, 'credit');
      }
      case 'config_nav_home': {
        return refresh(interaction, 'home');
      }
      case 'config_nav_status': {
        return refresh(interaction, 'status');
      }
      case 'config_toggle_credit': {
        configManager.set(`${creditPath}.enabled`, !credit.enabled);
        return refresh(interaction, 'credit');
      }
      case 'config_set_channel': {
        const modal = modalBuilder(
          'modal_set_channel',
          'Set Channel ID',
          'channel',
          'Channel ID',
          credit.channelId || '123456789012345678',
          true,
          TextInputStyle.Short,
          credit.channelId || ''
        );
        return interaction.showModal(modal);
      }
      case 'config_set_role': {
        const modal = modalBuilder(
          'modal_set_role',
          'Set Role ID',
          'role',
          'Role ID',
          credit.defaultRoleId || '123456789012345678',
          true,
          TextInputStyle.Short,
          credit.defaultRoleId || ''
        );
        return interaction.showModal(modal);
      }
      case 'config_set_reply': {
        const modal = modalBuilder(
          'modal_set_reply',
          'Set Reply Message',
          'reply',
          'Reply Message',
          credit.replyMessage || 'Thank you for your support!',
          false,
          TextInputStyle.Paragraph,
          credit.replyMessage || ''
        );
        return interaction.showModal(modal);
      }
      case 'config_add_reaction': {
        const modal = modalBuilder(
          'modal_add_reaction',
          'Add Reaction Emoji',
          'emoji',
          'Emoji',
          asList(credit.reactions).join(' ') || '<:example:123>',
          true,
          TextInputStyle.Short,
          ''
        );
        return interaction.showModal(modal);
      }
      case 'config_remove_reaction': {
        const modal = modalBuilder(
          'modal_remove_reaction',
          'Remove Reaction Emoji',
          'emoji',
          'Emoji to remove',
          asList(credit.reactions).join(' ') || '<:example:123>',
          true,
          TextInputStyle.Short,
          asList(credit.reactions)[0] || ''
        );
        return interaction.showModal(modal);
      }
      case 'config_toggle_delete': {
        configManager.set(`${creditPath}.deleteOldReply`, !credit.deleteOldReply);
        return refresh(interaction, 'credit');
      }
      case 'config_set_count': {
        const modal = modalBuilder(
          'modal_set_count',
          'Set Message Count',
          'count',
          'Message Count',
          `${credit.messageCount ?? 0}`,
          true,
          TextInputStyle.Short,
          `${credit.messageCount ?? 0}`
        );
        return interaction.showModal(modal);
      }
      case 'config_clear_reply': {
        configManager.set(`${creditPath}.replyMessage`, '');
        return refresh(interaction, 'credit');
      }
      case 'config_add_role_access': {
        const modal = modalBuilder(
          'modal_add_role_access',
          'Allow Role ID',
          'role',
          'Role ID',
          asList(perms.allowedRoles).join(', ') || '123456789012345678',
          true,
          TextInputStyle.Short,
          ''
        );
        return interaction.showModal(modal);
      }
      case 'config_add_user_access': {
        const modal = modalBuilder(
          'modal_add_user_access',
          'Allow User ID',
          'user',
          'User ID',
          asList(perms.allowedUsers).join(', ') || '123456789012345678',
          true,
          TextInputStyle.Short,
          ''
        );
        return interaction.showModal(modal);
      }
      case 'config_view_access': {
        return refresh(interaction, 'credit');
      }
      case 'config_status_set_channel': {
        const modal = modalBuilder(
          'modal_status_set_channel',
          'Status Channel ID',
          'channel',
          'Channel ID',
          status.channelId || '123456789012345678',
          true,
          TextInputStyle.Short,
          status.channelId || ''
        );
        return interaction.showModal(modal);
      }
      case 'config_status_set_message': {
        const modal = modalBuilder(
          'modal_status_set_message',
          'Status Message ID',
          'message',
          'Message ID',
          status.messageId || '123456789012345678',
          true,
          TextInputStyle.Short,
          status.messageId || ''
        );
        return interaction.showModal(modal);
      }
      case 'config_status_text_open': {
        const openState = status.states?.open || {};
        const modal = modalBuilder(
          'modal_status_text_open',
          'OPEN Text',
          'title',
          'Title',
          openState.title || '<:Ts_25_discord_high:...> STATUS : OPEN',
          true,
          TextInputStyle.Short,
          openState.title || ''
        );
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('fieldName')
              .setLabel('Field Name')
              .setPlaceholder(openState.fieldName || 'เช่น เวลาทำการ')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(openState.fieldName || '')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('fieldValue')
              .setLabel('Field Value')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setValue(openState.fieldValue || '')
          )
        );
        return interaction.showModal(modal);
      }
      case 'config_status_text_busy': {
        const busyState = status.states?.busy || {};
        const modal = modalBuilder(
          'modal_status_text_busy',
          'BUSY Text',
          'title',
          'Title',
          busyState.title || '<:Ts_25_discord_medium:...> STATUS : BUSY',
          true,
          TextInputStyle.Short,
          busyState.title || ''
        );
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('fieldName')
              .setLabel('Field Name')
              .setPlaceholder(busyState.fieldName || 'เช่น แจ้งเตือน')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(busyState.fieldName || '')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('fieldValue')
              .setLabel('Field Value')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setValue(busyState.fieldValue || '')
          )
        );
        return interaction.showModal(modal);
      }
      case 'config_status_text_close': {
        const closeState = status.states?.close || {};
        const modal = modalBuilder(
          'modal_status_text_close',
          'CLOSE Text',
          'title',
          'Title',
          closeState.title || '<:Ts_25_discord_low:...> STATUS : CLOSE',
          true,
          TextInputStyle.Short,
          closeState.title || ''
        );
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('fieldName')
              .setLabel('Field Name')
              .setPlaceholder(closeState.fieldName || 'เช่น แจ้งเตือน')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setValue(closeState.fieldName || '')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('fieldValue')
              .setLabel('Field Value')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setValue(closeState.fieldValue || '')
          )
        );
        return interaction.showModal(modal);
      }
      case 'config_status_media_open': {
        const openState = status.states?.open || {};
        const modal = modalBuilder(
          'modal_status_media_open',
          'OPEN Media',
          'thumbnail',
          'Thumbnail URL (empty = remove)',
          openState.thumbnail || 'https://',
          false,
          TextInputStyle.Short,
          openState.thumbnail || ''
        );
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('image')
              .setLabel('Image URL (empty = remove)')
              .setPlaceholder(openState.image || 'https://')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(openState.image || '')
          )
        );
        return interaction.showModal(modal);
      }
      case 'config_status_media_busy': {
        const busyState = status.states?.busy || {};
        const modal = modalBuilder(
          'modal_status_media_busy',
          'BUSY Media',
          'thumbnail',
          'Thumbnail URL (empty = remove)',
          busyState.thumbnail || 'https://',
          false,
          TextInputStyle.Short,
          busyState.thumbnail || ''
        );
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('image')
              .setLabel('Image URL (empty = remove)')
              .setPlaceholder(busyState.image || 'https://')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(busyState.image || '')
          )
        );
        return interaction.showModal(modal);
      }
      case 'config_status_media_close': {
        const closeState = status.states?.close || {};
        const modal = modalBuilder(
          'modal_status_media_close',
          'CLOSE Media',
          'thumbnail',
          'Thumbnail URL (empty = remove)',
          closeState.thumbnail || 'https://',
          false,
          TextInputStyle.Short,
          closeState.thumbnail || ''
        );
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('image')
              .setLabel('Image URL (empty = remove)')
              .setPlaceholder(closeState.image || 'https://')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setValue(closeState.image || '')
          )
        );
        return interaction.showModal(modal);
      }
      default:
        return interaction.reply({ content: 'Unknown action.', flags: MessageFlags.Ephemeral });
    }
  },

  async handleModal(interaction) {
    try {
      ensureAuthorized(interaction);
    } catch (err) {
      if (err.message === 'NOT_AUTHORIZED') {
        return interaction.reply({ content: '❌ You are not allowed to use this.', flags: MessageFlags.Ephemeral });
      }
      throw err;
    }

    const id = interaction.customId;
    const creditPath = CREDIT_PATH;
    const permsPath = PERMS_PATH;
    const statusPath = STATUS_PATH;

    if (id === 'modal_set_channel') {
      const value = interaction.fields.getTextInputValue('channel');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid channel ID.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      await configManager.set(`${creditPath}.channelId`, value);
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_status_set_channel') {
      const value = interaction.fields.getTextInputValue('channel');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid channel ID.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      await configManager.set(`${statusPath}.channelId`, value);
      await editExistingPanel(interaction, 'status');
      return;
    }

    if (id === 'modal_status_set_message') {
      const value = interaction.fields.getTextInputValue('message');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid message ID.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      await configManager.set(`${statusPath}.messageId`, value);
      await editExistingPanel(interaction, 'status');
      return;
    }

    if (id === 'modal_set_role') {
      const value = interaction.fields.getTextInputValue('role');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid role ID.', flags: MessageFlags.Ephemeral });
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
        return interaction.reply({ content: '❌ Count must be a number.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      await configManager.set(`${creditPath}.messageCount`, Number(value));
      await editExistingPanel(interaction);
      return;
    }

    if (id === 'modal_add_role_access') {
      const value = interaction.fields.getTextInputValue('role');
      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ Invalid role ID.', flags: MessageFlags.Ephemeral });
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
        return interaction.reply({ content: '❌ Invalid user ID.', flags: MessageFlags.Ephemeral });
      }
      const list = asList(configManager.get(`${permsPath}.allowedUsers`));
      if (!list.includes(value)) list.push(value);
      await interaction.deferUpdate();
      await configManager.set(`${permsPath}.allowedUsers`, list);
      await editExistingPanel(interaction);
      return;
    }

    const statusTextModal = id.match(/^modal_status_text_(open|busy|close)$/);
    if (statusTextModal) {
      const state = statusTextModal[1];
      const title = interaction.fields.getTextInputValue('title');
      const fieldName = interaction.fields.getTextInputValue('fieldName');
      const fieldValue = interaction.fields.getTextInputValue('fieldValue');
      await interaction.deferUpdate();
      configManager.set(`${statusPath}.states.${state}.title`, title);
      configManager.set(`${statusPath}.states.${state}.fieldName`, fieldName);
      configManager.set(`${statusPath}.states.${state}.fieldValue`, fieldValue);
      await editExistingPanel(interaction, 'status');
      return;
    }

    const statusMediaModal = id.match(/^modal_status_media_(open|busy|close)$/);
    if (statusMediaModal) {
      const state = statusMediaModal[1];
      const thumbnail = interaction.fields.getTextInputValue('thumbnail').trim();
      const image = interaction.fields.getTextInputValue('image').trim();
      await interaction.deferUpdate();
      configManager.set(`${statusPath}.states.${state}.thumbnail`, thumbnail || '');
      configManager.set(`${statusPath}.states.${state}.image`, image || '');
      await editExistingPanel(interaction, 'status');
      return;
    }

    return interaction.reply({ content: 'Unknown modal.', flags: MessageFlags.Ephemeral });
  }
};
