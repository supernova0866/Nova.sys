const { SlashCommandBuilder } = require('discord.js');
const { getGlobalStats, getUserStats, listAuth } = require('../db');
const { textDisplay, separator } = require('../utils/components');
const sourceData = require('../assets/source.json');
const activityData = require('../assets/activity.json');
const { OWNER_ID } = require('../config');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad(str, len) {
  str = String(str);
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function rpad(str, len) {
  str = String(str);
  return ' '.repeat(Math.max(0, len - str.length)) + str;
}

const MEDALS = ['🥇', '🥈', '🥉'];

const FUN_FACTS = {
  cats: 'Cats Served',
  ship: 'Relationships Fabricated',
  rate: 'Ratings Invented',
  github: 'GitHub Profiles Stalked',
  calc: 'Equations Solved',
  define: 'Words Looked Up',
  urban: 'Slang Acquired',
  time: 'Timezones Checked',
  color: 'Colors Inspected',
  lyrics: 'Songs Researched',
  avatar: 'Avatars Collected',
  banner: 'Banners Inspected',
  ascii: 'ASCII Arts Generated',
};

const COMBOS = {
  'define+urban': 'define_urban',
  'urban+define': 'define_urban',
  'lyrics+urban': 'lyrics_urban',
  'urban+lyrics': 'lyrics_urban',
  'avatar+banner': 'avatar_banner',
  'banner+avatar': 'avatar_banner',
};

function getActivity(topCommands) {
  const top = topCommands[0]?.command ?? 'cats';
  const second = topCommands[1]?.command ?? null;

  if (second) {
    const comboKey = `${top}+${second}`;
    const comboPool = COMBOS[comboKey] ? activityData[COMBOS[comboKey]] : null;
    if (comboPool && Math.random() < 0.5) {
      return pick(comboPool);
    }
  }

  const pool = activityData[top] ?? activityData['cats'];
  return pick(pool);
}

// ─── Global Overview ───────────────────────────────────────────────
function buildGlobalOverview(data, requesterId) {
  const { total, denied, authorizedUsers, topCommands, allCommands } = data;

  const topLines = topCommands.map((r, i) =>
    `${MEDALS[i]} ${pad('/' + r.command, 12)} ${Number(r.total).toLocaleString()}`
  ).join('\n');

  const funFacts = allCommands
    .filter(r => FUN_FACTS[r.command])
    .slice(0, 4)
    .map(r => `${pad(FUN_FACTS[r.command] + ':', 28)} ${Number(r.total).toLocaleString()}`)
    .join('\n');

  const source = pick(sourceData.global_overview);

  return buildPayload('global', 'overview', requesterId, [
    textDisplay(`## Nova.sys Statistics`),
    separator(),
    textDisplay(
      `Total Commands: **${total.toLocaleString()}**\n` +
      `Denied Requests: **${denied.toLocaleString()}**\n` +
      `Authorized Users: **${authorizedUsers.toLocaleString()}**`
    ),
    separator(),
    textDisplay(`**Most Used Commands**\n\`\`\`\n${topLines || 'No data yet'}\n\`\`\``),
    separator(),
    textDisplay(`**Fun Facts**\n\`\`\`\n${funFacts || 'No data yet'}\n\`\`\``),
    separator(),
    textDisplay(`-# ${source}`),
  ]);
}

// ─── Global Commands ───────────────────────────────────────────────
function buildGlobalCommands(data, requesterId) {
  const { total, allCommands } = data;

  const lines = allCommands.map(r =>
    `${pad('/' + r.command, 16)} ${rpad(Number(r.total).toLocaleString(), 6)}`
  ).join('\n');

  const mostUsed = allCommands[0]?.command ?? '—';
  const leastUsed = allCommands[allCommands.length - 1]?.command ?? '—';
  const source = pick(sourceData.global_commands);

  return buildPayload('global', 'commands', requesterId, [
    textDisplay(`## Command Usage`),
    separator(),
    textDisplay(`\`\`\`\n${lines || 'No data yet'}\n\`\`\``),
    separator(),
    textDisplay(
      `Total Commands\n**${total.toLocaleString()}**\n\n` +
      `Most Used\n**/${mostUsed}**\n\n` +
      `Least Used\n**/${leastUsed}**`
    ),
    separator(),
    textDisplay(`-# ${source}`),
  ]);
}

// ─── User Stats ────────────────────────────────────────────────────
function buildUserStats(username, data, isSelf, requesterId) {
  const { userTotal, globalTotal, topCommands, mostUsed } = data;

  const contribution = globalTotal > 0
    ? ((userTotal / globalTotal) * 100).toFixed(1)
    : '0.0';

  const source = pick(isSelf ? sourceData.user_self : sourceData.user_other);

  if (userTotal === 0) {
    return buildPayload('user', null, requesterId, [
      textDisplay(`## Statistics for ${username}`),
      separator(),
      textDisplay(`Commands Used\n**0**`),
      separator(),
      textDisplay(`No activity detected.\n\nThe subject appears to be observing the bot from a safe distance.`),
      separator(),
      textDisplay(`-# ${pick(sourceData.user_zero)}`),
    ]);
  }

  const topLines = topCommands.map(r =>
    `${pad('/' + r.command, 16)} ${rpad(Number(r.count).toLocaleString(), 6)}`
  ).join('\n');

  const activity = getActivity(topCommands);

  return buildPayload('user', null, requesterId, [
    textDisplay(`## Statistics for ${username}`),
    separator(),
    textDisplay(`Commands Used\n**${userTotal.toLocaleString()}**`),
    separator(),
    textDisplay(`**Most Used**\n\`\`\`\n${topLines}\n\`\`\``),
    separator(),
    textDisplay(`**Contribution**\n\n${contribution}% of all commands`),
    separator(),
    textDisplay(`**Favorite Activity**\n\n${activity}`),
    separator(),
    textDisplay(`-# ${source}`),
  ]);
}

// ─── Payload builder ───────────────────────────────────────────────
function buildPayload(scope, page, requesterId, components) {
  const buttons = [];

  if (scope === 'global') {
    buttons.push(
      {
        type: 2,
        style: page === 'overview' ? 1 : 2,
        label: 'Overview',
        custom_id: `stats_global_overview_${requesterId}`,
      },
      {
        type: 2,
        style: page === 'commands' ? 1 : 2,
        label: 'Commands',
        custom_id: `stats_global_commands_${requesterId}`,
      }
    );
  }

  const actionRows = [];
  if (buttons.length) actionRows.push({ type: 1, components: buttons });
  actionRows.push({
    type: 1,
    components: [{ type: 2, style: 4, label: '✕', custom_id: `delete_${requesterId}` }],
  });

  return {
    flags: 1 << 15,
    components: [
      {
        type: 17,
        components: [...components, ...actionRows],
      },
    ],
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View bot or user usage stats')
    .addStringOption(o =>
      o.setName('scope').setDescription('What stats to show').setRequired(false)
        .addChoices(
          { name: 'global', value: 'global' },
          { name: 'user', value: 'user' },
        )
    )
    .addUserOption(o =>
      o.setName('user').setDescription('User to view stats for (user scope only)').setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const scope = interaction.options.getString('scope') ?? 'global';
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    await interaction.deferReply();

    if (scope === 'global') {
      const data = await getGlobalStats();
      return interaction.editReply(buildGlobalOverview(data, interaction.user.id));
    }

    const data = await getUserStats(targetUser.id);
    const isSelf = targetUser.id === interaction.user.id;
    return interaction.editReply(buildUserStats(targetUser.username, data, isSelf, interaction.user.id));
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_'); // stats_scope_page_requesterId
    const scope = parts[1];
    const page = parts[2];
    const requesterId = parts.slice(3).join('_');

    if (interaction.user.id !== requesterId && interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ This belongs to someone else.', flags: 64 });
    }

    await interaction.deferUpdate();
    const data = await getGlobalStats();
    const payload = page === 'overview'
      ? buildGlobalOverview(data, requesterId)
      : buildGlobalCommands(data, requesterId);

    await interaction.editReply(payload);
  },
};
