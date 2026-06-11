const { OWNER_ID } = require('../config');

function parseRange(rangeStr) {
  rangeStr = rangeStr.trim();
  if (rangeStr.includes('-')) {
    const [min, max] = rangeStr.split('-').map(Number);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  if (rangeStr.startsWith('>')) {
    const x = Number(rangeStr.slice(1));
    return Math.floor(Math.random() * (100 - x)) + x + 1;
  }
  if (rangeStr.startsWith('<')) {
    const x = Number(rangeStr.slice(1));
    return Math.floor(Math.random() * x);
  }
  return Math.floor(Math.random() * 101);
}

function deleteButton(requesterId) {
  return {
    type: 1,
    components: [
      {
        type: 2,
        style: 4,
        label: '✕',
        custom_id: `delete_${requesterId}`,
      },
    ],
  };
}

function container(components, requesterId) {
  return {
    flags: 1 << 15,
    components: [
      {
        type: 17,
        components: [
          ...components,
          deleteButton(requesterId),
        ],
      },
    ],
  };
}

function textDisplay(content) {
  return { type: 10, content };
}

function separator() {
  return { type: 14, divider: true, spacing: 1 };
}

async function handleDelete(interaction) {
  const requesterId = interaction.customId.replace('delete_', '');
  if (interaction.user.id !== requesterId && interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: 'You cannot delete this message.', flags: 64 });
  }
  await interaction.message.delete();
}

module.exports = { parseRange, deleteButton, container, textDisplay, separator, handleDelete };
