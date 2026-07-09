const { OWNER_ID } = require('../config');

function parseRange(rangeStr) {
  const [min, max] = rangeStr.trim().split('-').map(Number);
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

  try {
    // Delete via the interaction's own webhook route instead of a
    // channel-permission-based REST call. This still works even when the
    // command was used as a user-installed app in a guild the bot itself
    // isn't a member of (no bot-level channel permissions exist there),
    // since webhook actions are authorized by the interaction token, not
    // by the bot's own guild permissions.
    await interaction.deferUpdate();
    await interaction.deleteReply();
  } catch (err) {
    console.error('[Delete] Failed to delete message:', err.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Couldn\'t delete this message.',
        flags: 64,
      }).catch(() => {});
    }
  }
}

module.exports = { parseRange, deleteButton, container, textDisplay, separator, handleDelete };
