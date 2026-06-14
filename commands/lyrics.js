const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { container, textDisplay, separator, deleteButton } = require('../utils/components');
const { GENIUS_TOKEN } = require('../config');
const geniusCounter = require('../utils/geniusCounter');

async function searchGenius(song, artist) {
  const query = artist ? `${song} ${artist}` : song;
  const res = await axios.get('https://api.genius.com/search', {
    headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
    params: { q: query },
  });
  return res.data.response.hits[0]?.result ?? null;
}

async function fetchLyricsOvh(artist, title) {
  try {
    const res = await axios.get(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
      { timeout: 5000 }
    );
    return res.data.lyrics?.trim() || null;
  } catch {
    return null;
  }
}

function chunkLyrics(lyrics) {
  const chunks = [];
  let current = '';
  for (const line of lyrics.split('\n')) {
    if ((current + '\n' + line).length > 1800) {
      chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Find lyrics for a song')
    .addStringOption(o => o.setName('song').setDescription('Song title').setRequired(true))
    .addStringOption(o => o.setName('artist').setDescription('Artist name (optional)').setRequired(false))
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const song = interaction.options.getString('song');
    const artist = interaction.options.getString('artist');
    await interaction.deferReply();

    let result;
    try {
      result = await searchGenius(song, artist);
    } catch {
      return interaction.editReply({ content: '❌ Failed to reach Genius API.' });
    }

    if (!result) {
      return interaction.editReply({ content: `❌ No results found for **${song}**${artist ? ` by ${artist}` : ''}.` });
    }

    geniusCounter.increment();

    const releaseDate = result.release_date_for_display || 'Unknown';
    const views = result.stats?.pageviews ? result.stats.pageviews.toLocaleString() : 'N/A';
    const thumbnail = result.song_art_image_thumbnail_url;
    const artistName = result.primary_artist.name;
    const songTitle = result.title;

    // Fetch lyrics in parallel
    const lyrics = await fetchLyricsOvh(artistName, songTitle);

    const components = [
      textDisplay(`## 🎵 ${result.full_title}`),
      separator(),
    ];

    if (thumbnail) {
      components.push({ type: 12, alt_text: "image", media: { url: thumbnail } });
      components.push(separator());
    }

    components.push(textDisplay(
      `**Artist:** ${artistName}\n` +
      `**Released:** ${releaseDate}\n` +
      `**Genius views:** ${views}\n\n` +
      `📖 [Read full lyrics on Genius](${result.url})`
    ));

    // Add Show Lyrics button if lyrics were found
    const actionRow = {
      type: 1,
      components: [
        ...(lyrics ? [{
          type: 2,
          style: 1,
          label: 'Show Lyrics',
          custom_id: `lyrics_show_${interaction.id}`,
        }] : []),
        {
          type: 2,
          style: 4,
          label: '✕',
          custom_id: `delete_${interaction.user.id}`,
        },
      ],
    };

    // Store lyrics temporarily on the client for the button handler
    interaction.client._lyricsCache = interaction.client._lyricsCache || new Map();
    if (lyrics) {
      interaction.client._lyricsCache.set(interaction.id, {
        title: result.full_title,
        lyrics,
        requesterId: interaction.user.id,
        expires: Date.now() + 10 * 60 * 1000, // 10 min TTL
      });
    }

    await interaction.editReply({
      flags: 1 << 15,
      components: [
        { type: 17, components: [...components, actionRow] },
      ],
    });
  },

  async handleShowLyrics(interaction) {
    const cache = interaction.client._lyricsCache;
    const interactionId = interaction.customId.replace('lyrics_show_', '');
    const data = cache?.get(interactionId);

    if (!data || Date.now() > data.expires) {
      return interaction.reply({ content: '❌ Lyrics expired, run the command again.', flags: 64 });
    }

    const chunks = chunkLyrics(data.lyrics);

    // Send first chunk as reply, rest as follow-ups
    for (let i = 0; i < chunks.length; i++) {
      const isFirst = i === 0;
      const isLast = i === chunks.length - 1;

      const components = [
        textDisplay(isFirst ? `## 🎵 ${data.title}\n\n${chunks[i]}` : chunks[i]),
      ];

      if (isLast) components.push(deleteButton(data.requesterId));

      const payload = {
        flags: 1 << 15,
        components: [{ type: 17, components }],
      };

      if (isFirst) {
        await interaction.reply(payload);
      } else {
        await interaction.followUp(payload);
      }
    }

    cache.delete(interactionId);
  },
};
    
