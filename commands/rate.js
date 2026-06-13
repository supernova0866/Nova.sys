const { SlashCommandBuilder } = require('discord.js');
const { container, textDisplay, separator } = require('../utils/components');
const auraData = require('../assets/aura.json');

const TYPES = [
  { name: 'aura', value: 'aura' },
  { name: 'epicgamer', value: 'epicgamer' },
  { name: 'dank', value: 'dank' },
  { name: 'gay', value: 'gay' },
  { name: 'simp', value: 'simp' },
  { name: 'stank', value: 'stank' },
  { name: 'bad', value: 'bad' },
  { name: 'peepee', value: 'peepee' },
  { name: 'waifu', value: 'waifu' },
];

const COMMENTS = {
  aura: {
    high: ['certified aura god 🌟', 'the drip is immaculate ✨', 'radiates pure sigma energy 💫'],
    mid: ["aura is mid but it's there 🤷", 'some days you got it, some days... 😐', 'the aura flickers 🕯️'],
    low: ['zero aura detected 💀', 'actively losing aura as we speak 📉', 'aura in the negatives fr 😭'],
  },
  epicgamer: {
    high: ['GG EZ no re 🎮', 'certified epic gamer moment 🕹️', 'this person carries every game 👑'],
    mid: ['average gamer, respectable 🎯', 'sometimes they clutch, sometimes they int 😅', 'stuck in elo hell 📊'],
    low: ['skill issue 💀', "haven't touched grass but still bad at games 🌱", 'bootcamp speedrun any% 😬'],
  },
  dank: {
    high: ['dankness levels are over 9000 🔥', 'certified dank lord 🐸', 'the memes flow through them ⚡'],
    mid: ['occasionally dank, mostly mid 🫤', 'the dankness is inconsistent 📉', 'tries to be dank 🤔'],
    low: ['uses impact font unironically 💀', 'shares minion memes 😭', 'posting 2012 memes in 2025 📅'],
  },
  gay: {
    high: ['extremely gay, no notes 🌈', 'gay as the day is long 🏳️‍🌈', 'fabulously, spectacularly gay ✨'],
    mid: ['moderately gay 🤷', 'bisexual energy detected 💜', 'the vibes are queer 👀'],
    low: ['so straight it hurts 😐', 'never heard of gay 🏳️', 'certified heterosexual 📋'],
  },
  simp: {
    high: ['chronic simp, no cure 💸', "opens doors for everyone they've ever seen 🚪", 'simping at an Olympic level 🥇'],
    mid: ['simps occasionally but hides it 🫣', 'the simp energy is contained... barely 😅', 'functional simp 📊'],
    low: ['zero simp detected ❄️', 'emotionally unavailable king/queen 👑', 'incapable of simping, respect 💪'],
  },
  stank: {
    high: ['absolutely rancid 🤢', 'smells like a gym locker in August 💀', 'the stank precedes them by 3 rooms 😭'],
    mid: ['a little funky but manageable 🌬️', 'the smell is... present 👃', 'mid stank, conditional proximity 🤝'],
    low: ['smells like lavender and good decisions 🌸', 'fresh as a Febreze commercial 💨', 'suspiciously clean 🧼'],
  },
  bad: {
    high: ['menace to society certified 😈', 'absolutely unhinged, maximum bad 💀', 'chaotic evil and thriving 🔥'],
    mid: ['bad but like, in a charming way 😏', 'does crimes but small ones 🤏', 'occasionally bad, mostly vibes 😤'],
    low: ['lawful good, boring edition 😇', 'has never jaywalked 🚶', 'the most behaved person alive 📋'],
  },
  waifu: {
    high: ['top tier waifu material 💖', 'certified best girl/boy 🌸', 'waifu of the century, no contest 👑'],
    mid: ['decent waifu potential 🤔', 'background character energy but loveable 💛', 'waifu mid tier, still valid 💕'],
    low: ['villain arc waifu 😈', 'no one is waifuing this 💀', 'anti-waifu certified 🚫'],
  },
};

const EMOJIS = {
  aura: '✨', epicgamer: '🎮', dank: '🐸', gay: '🌈',
  simp: '💸', stank: '💀', bad: '😈', peepee: '📏', waifu: '💖',
};

// Rigged scores for bot easter egg
// High = good (90-100), Low = good for negative types (0-5)
const BOT_SCORES = {
  aura: () => Math.floor(Math.random() * 11) + 90,       // 90-100
  epicgamer: () => Math.floor(Math.random() * 11) + 90,  // 90-100
  dank: () => Math.floor(Math.random() * 11) + 90,       // 90-100
  waifu: () => Math.floor(Math.random() * 11) + 90,      // 90-100
  peepee: () => Math.floor(Math.random() * 11) + 90,     // 90-100
  gay: () => Math.floor(Math.random() * 6),              // 0-5
  simp: () => Math.floor(Math.random() * 6),             // 0-5
  stank: () => Math.floor(Math.random() * 6),            // 0-5
  bad: () => Math.floor(Math.random() * 6),              // 0-5
};

const BOT_PEEPEE_MSG = "I run on Node.js. Not whatever you were expecting. The follow-up question is why. Also, how did you get here, and why did Nova even authorise you.";

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getComment(type, score) {
  const pool = score >= 70 ? COMMENTS[type].high : score >= 40 ? COMMENTS[type].mid : COMMENTS[type].low;
  return pick(pool);
}

function getBar(score) {
  const filled = Math.round(score / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function getPeepeeBar(score) {
  const bars = Math.round((score / 100) * 20);
  return '8' + '='.repeat(bars) + 'D';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Rate a user on a specific trait')
    .addStringOption(o =>
      o.setName('type').setDescription('What to rate').setRequired(true)
        .addChoices(...TYPES)
    )
    .addUserOption(o =>
      o.setName('user').setDescription('User to rate').setRequired(true)
    )
    .setIntegrationTypes([1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const user = interaction.options.getUser('user');
    const isSelf = user.id === interaction.client.user.id;
    const typeCap = type.charAt(0).toUpperCase() + type.slice(1);
    const displayName = user.displayName ?? user.username;

    function getAuraMessage() {
      const entries = Object.values(auraData);
      const template = entries[Math.floor(Math.random() * entries.length)];
      return template.replace('<displayname>', displayName);
    }

    // Bot easter egg
    if (isSelf) {
      if (type === 'peepee') {
        const components = [
          textDisplay(`## peepee r8 machine`),
          separator(),
          textDisplay(BOT_PEEPEE_MSG),
        ];
        return interaction.reply(container(components, interaction.user.id));
      }

      if (type === 'aura') {
        const components = [
          textDisplay(`## aura check machine`),
          separator(),
          textDisplay(`${displayName} has infinite aura.`),
        ];
        return interaction.reply(container(components, interaction.user.id));
      }

      const score = BOT_SCORES[type]();
      const comment = getComment(type, score);
      const components = [
        textDisplay(`## ${typeCap} r8 machine`),
        separator(),
        textDisplay(`${user.username} is **${score}%** ${type}.\n\n*${comment}*`),
      ];
      return interaction.reply(container(components, interaction.user.id));
    }

    // Normal rating
    const score = Math.floor(Math.random() * 101);
    const comment = getComment(type, score);

    let title, body;

    if (type === 'aura') {
      title = `## aura check machine`;
      body = getAuraMessage();
    } else if (type === 'peepee') {
      const bar = getPeepeeBar(score);
      title = `## peepee r8 machine`;
      body = `${displayName}'s peepee\n\`${bar}\`\n\n*${comment}*`;
    } else {
      title = `## ${typeCap} r8 machine`;
      body = `${displayName} is **${score}%** ${type}.\n\n*${comment}*`;
    }

    const components = [
      textDisplay(title),
      separator(),
      textDisplay(body),
    ];

    await interaction.reply(container(components, interaction.user.id));
  },
};
