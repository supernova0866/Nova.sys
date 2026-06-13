const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { container, textDisplay, separator } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urban')
    .setDescription('Look up a word on Urban Dictionary')
    .addStringOption(o =>
      o.setName('word').setDescription('Word or phrase to look up').setRequired(true)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const word = interaction.options.getString('word').trim();
    await interaction.deferReply();

    let entries;
    try {
      const res = await axios.get(`https://api.urbandictionary.com/v0/define`, { params: { term: word } });
      entries = res.data.list;
    } catch {
      return interaction.editReply({ content: '❌ Failed to reach Urban Dictionary.' });
    }

    if (!entries?.length) {
      return interaction.editReply({ content: `❌ No Urban Dictionary results for **${word}**.` });
    }

    const top = entries[0];
    const definition = top.definition.replace(/\[|\]/g, '').slice(0, 900);
    const example = top.example?.replace(/\[|\]/g, '').slice(0, 400);
    const thumbsUp = top.thumbs_up.toLocaleString();
    const thumbsDown = top.thumbs_down.toLocaleString();
    const author = top.author;
    const written = new Date(top.written_on);
    const unix = Math.floor(written.getTime() / 1000);

    const components = [
      textDisplay(`## 📖 ${top.word}`),
      separator(),
      textDisplay(definition),
    ];

    if (example) {
      components.push(separator());
      components.push(textDisplay(`*${example}*`));
    }

    components.push(separator());
    components.push(textDisplay(
      `👍 ${thumbsUp} · 👎 ${thumbsDown} · by **${author}** · <t:${unix}:D>\n` +
      `[View on Urban Dictionary](${top.permalink})`
    ));

    await interaction.editReply(container(components, interaction.user.id));
  },
};
