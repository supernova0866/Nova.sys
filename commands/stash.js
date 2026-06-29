const { SlashCommandBuilder } = require('discord.js');
const { container, textDisplay, separator, deleteButton } = require('../utils/components');
const stashData = require('../assets/stash.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stash')
    .setDescription('Access your personal image stash')
    .addStringOption(o =>
      o.setName('tag').setDescription('Tag to look up').setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const tag = interaction.options.getString('tag')?.trim().toLowerCase();
    const userId = interaction.user.id;

    const userStash = stashData.users[userId];

    if (!userStash) {
      return interaction.reply({ content: '❌ You have no stash entries.', flags: 64 });
    }

    // No tag provided — show paginated tag list
    if (!tag) {
      const page = 0;
      return showTagList(interaction, userStash, page);
    }

    const entry = userStash[tag];

    if (!entry) {
      const available = Object.keys(userStash).map(t => `\`${t}\``).join(', ');
      return interaction.reply({ content: `❌ Tag \`${tag}\` not found. Your tags: ${available}`, flags: 64 });
    }

    const components = [
      textDisplay(`## ${entry.desc}`),
      separator(),
      ...entry.urls.map(url => ({ type: 12, items: [{ media: { url } }] })),
    ];

    await interaction.reply(container(components, interaction.user.id));
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_');
    // stash_page_pageNum_requesterId
    const page = parseInt(parts[2]);
    const requesterId = parts.slice(3).join('_');

    if (interaction.user.id !== requesterId) {
      return interaction.reply({ content: '❌ This belongs to someone else.', flags: 64 });
    }

    const userStash = stashData.users[requesterId];
    if (!userStash) return;

    await interaction.deferUpdate();
    return showTagList(interaction, userStash, page, true);
  },
};

function showTagList(interaction, userStash, page, isUpdate = false) {
  const PAGE_SIZE = 20;
  const tags = Object.keys(userStash);
  const totalPages = Math.ceil(tags.length / PAGE_SIZE);
  const pageTags = tags.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const requesterId = interaction.user.id;

  const lines = pageTags.map((t, i) => `${page * PAGE_SIZE + i + 1}. \`${t}\` — ${userStash[t].desc}`).join('\n');

  const navButtons = [];
  if (page > 0) navButtons.push({
    type: 2, style: 2, label: '← Prev',
    custom_id: `stash_page_${page - 1}_${requesterId}`,
  });
  if (page < totalPages - 1) navButtons.push({
    type: 2, style: 2, label: 'Next →',
    custom_id: `stash_page_${page + 1}_${requesterId}`,
  });

  const components = [
    textDisplay(`## 🗂️ Your Stash — Page ${page + 1}/${totalPages}`),
    separator(),
    textDisplay(lines),
  ];

  const actionRows = [];
  if (navButtons.length) actionRows.push({ type: 1, components: navButtons });
  actionRows.push(deleteButton(requesterId));

  const payload = {
    flags: (1 << 15) | 64,
    components: [{
      type: 17,
      components: [...components, ...actionRows],
    }],
  };

  if (isUpdate) return interaction.editReply(payload);
  return interaction.reply(payload);
}
