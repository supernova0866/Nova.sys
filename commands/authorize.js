const { SlashCommandBuilder } = require('discord.js');
const { OWNER_ID } = require('../config');
const { container, textDisplay, separator } = require('../utils/components');
const { addAuth, removeAuth, listAuth, isAuthorized } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('authorize')
    .setDescription('Manage authorized users (owner only)')
    .addStringOption(o =>
      o.setName('mode').setDescription('Action to perform').setRequired(true)
        .addChoices(
          { name: 'add', value: 'add' },
          { name: 'remove', value: 'remove' },
          { name: 'list', value: 'list' },
        )
    )
    .addUserOption(o =>
      o.setName('user').setDescription('User to add or remove').setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ You are not authorized to use this command.', flags: 64 });
    }

    const mode = interaction.options.getString('mode');
    const user = interaction.options.getUser('user');

    if ((mode === 'add' || mode === 'remove') && !user) {
      return interaction.reply({ content: `❌ A user is required for \`${mode}\`.`, flags: 64 });
    }

    await interaction.deferReply();

    if (mode === 'add') {
      const already = await isAuthorized(user.id);
      if (already) {
        return interaction.editReply({ content: `⚠️ **${user.username}** is already authorized.` });
      }
      await addAuth(user.id, user.username);
      return interaction.editReply({ content: `✅ **${user.username}** (\`${user.id}\`) has been authorized.` });
    }

    if (mode === 'remove') {
      const exists = await isAuthorized(user.id);
      if (!exists) {
        return interaction.editReply({ content: `⚠️ **${user.username}** is not in the authorized list.` });
      }
      await removeAuth(user.id);
      return interaction.editReply({ content: `🗑️ **${user.username}** (\`${user.id}\`) has been removed.` });
    }

    if (mode === 'list') {
      const users = await listAuth();
      if (!users.length) {
        return interaction.editReply({ content: '📋 No authorized users yet.' });
      }
      const lines = users.map((u, i) => `${i + 1}. <@${u.user_id}> — \`${u.user_id}\``).join('\n');
      const components = [
        textDisplay('## 📋 Authorized Users'),
        separator(),
        textDisplay(lines),
      ];
      return interaction.editReply(container(components, interaction.user.id));
    }
  },
};
