const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { container, textDisplay, separator } = require('../utils/components');
const geniusCounter = require('../utils/geniusCounter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ratelimit')
    .setDescription('Check API rate limit status')
    .setIntegrationTypes([1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    await interaction.deferReply();

    // GitHub — free endpoint, doesn't count against limit
    let ghText;
    try {
      const res = await axios.get('https://api.github.com/rate_limit', {
        headers: process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {},
      });
      const core = res.data.resources.core;
      const remaining = core.remaining;
      const limit = core.limit;
      const reset = core.reset;
      const used = limit - remaining;
      const bar = (() => {
        const pct = remaining / limit;
        const filled = Math.round(pct * 10);
        return '█'.repeat(filled) + '░'.repeat(10 - filled);
      })();

      ghText =
        `### GitHub\n` +
        `\`${bar}\` ${remaining.toLocaleString()} / ${limit.toLocaleString()} remaining\n` +
        `Used: ${used.toLocaleString()} · Resets <t:${reset}:R>`;
    } catch {
      ghText = '### GitHub\n❌ Failed to fetch';
    }

    const staticAPIs = [
      {
        name: 'Genius',
        info: `${geniusCounter.getCount().toLocaleString()} / 1,000 used today · Resets <t:${geniusCounter.getResetUnix()}:R>`,
        usage: 'Used by `/lyrics` — 1 request per command',
      },
      {
        name: 'Urban Dictionary',
        info: 'Unofficial API · No rate limit documented',
        usage: 'Used by `/urban` — 1 request per command',
      },
      {
        name: 'lyrics.ovh',
        info: 'Free, no documented rate limit',
        usage: 'Used by `/lyrics` Show Lyrics button — 1 request per command',
      },
      {
        name: 'Free Dictionary',
        info: 'Free, no documented rate limit',
        usage: 'Used by `/define` — 1 request per command',
      },
    ];

    const staticText = staticAPIs.map(api =>
      `### ${api.name}\n${api.info}\n-# ${api.usage}`
    ).join('\n\n');

    const components = [
      textDisplay(`## 📊 API Rate Limits`),
      separator(),
      textDisplay(ghText),
      separator(),
      textDisplay(staticText),
    ];

    await interaction.editReply(container(components, interaction.user.id));
  },
};
