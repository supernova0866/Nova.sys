const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { container, textDisplay, separator } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('define')
    .setDescription('Look up the definition of a word')
    .addStringOption(o =>
      o.setName('word').setDescription('Word to define').setRequired(true)
    )
    .setIntegrationTypes([1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const word = interaction.options.getString('word').trim();
    await interaction.deferReply();

    let data;
    try {
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      data = res.data[0];
    } catch {
      return interaction.editReply({ content: `❌ No definition found for **${word}**.` });
    }

    const meanings = data.meanings.slice(0, 3).map(m => {
      const defs = m.definitions.slice(0, 2).map((d, i) => {
        let text = `${i + 1}. ${d.definition}`;
        if (d.example) text += `\n> *"${d.example}"*`;
        return text;
      }).join('\n');
      return `**${m.partOfSpeech}**\n${defs}`;
    }).join('\n\n');

    const phonetic = data.phonetic ? ` ${data.phonetic}` : '';

    const components = [
      textDisplay(`## 📖 ${data.word}${phonetic}`),
      separator(),
      textDisplay(meanings),
    ];

    if (data.sourceUrls?.[0]) {
      components.push(separator());
      components.push(textDisplay(`[Source](${data.sourceUrls[0]})`));
    }

    await interaction.editReply(container(components, interaction.user.id));
  },
};
