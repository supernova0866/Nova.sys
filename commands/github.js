const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { textDisplay, separator } = require('../utils/components');
const { OWNER_ID } = require('../config');

const ghHeaders = process.env.GITHUB_TOKEN
  ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
  : {};

const trunc = (str, len) => str && str.length > len ? str.slice(0, len - 3) + '...' : str;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function deleteButton(requesterId) {
  return {
    type: 1,
    components: [{
      type: 2, style: 4, label: '✕',
      custom_id: `delete_${requesterId}`,
    }],
  };
}

function pageSelect(username, activePage, requesterId) {
  return {
    type: 1,
    components: [{
      type: 3,
      custom_id: `github_${username}_${requesterId}`,
      options: [
        { label: 'Profile', value: 'profile', default: activePage === 'profile' },
        { label: 'Repos', value: 'repos', default: activePage === 'repos' },
        { label: 'Languages', value: 'languages', default: activePage === 'languages' },
        { label: 'Details', value: 'details', default: activePage === 'details' },
        { label: 'Activity', value: 'activity', default: activePage === 'activity' },
      ],
    }],
  };
}

function buildPayload(components, username, activePage, requesterId) {
  return {
    flags: 1 << 15,
    components: [{
      type: 17,
      components: [
        ...components,
        pageSelect(username, activePage, requesterId),
        deleteButton(requesterId),
      ],
    }],
  };
}

async function fetchUser(username) {
  const [userRes, reposRes] = await Promise.all([
    axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: ghHeaders }),
    axios.get(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=stars&per_page=10`, { headers: ghHeaders }),
  ]);
  return { user: userRes.data, repos: reposRes.data };
}

async function fetchRepo(username, repo) {
  const res = await axios.get(
    `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`,
    { headers: ghHeaders }
  );
  return res.data;
}

async function fetchLanguages(repos) {
  const langTotals = {};
  await Promise.all(repos.slice(0, 10).map(async r => {
    try {
      const res = await axios.get(r.languages_url, { headers: ghHeaders });
      for (const [lang, bytes] of Object.entries(res.data)) {
        langTotals[lang] = (langTotals[lang] || 0) + bytes;
      }
    } catch {}
  }));
  return langTotals;
}

// ─── Pages ────────────────────────────────────────────────────────

function buildProfile(user, requesterId) {
  const created = Math.floor(new Date(user.created_at).getTime() / 1000);
  const components = [
    textDisplay(`## ${trunc(user.name ?? user.login, 100)} — [${user.login}](${user.html_url})`),
    separator(),
    { type: 12, media: { url: user.avatar_url } },
    separator(),
    textDisplay(
      (user.bio ? `*${trunc(user.bio, 200)}*\n\n` : '') +
      `👥 **Followers:** ${user.followers.toLocaleString()} • ` +
      `👤 **Following:** ${user.following.toLocaleString()} • ` +
      `📦 **Public repos:** ${user.public_repos.toLocaleString()} • ` +
      `📅 **Joined:** <t:${created}:D>`
    ),
  ];
  return components;
}

function buildRepos(repos, requesterId) {
  const sorted = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
  const lines = sorted.slice(0, 10).map(r =>
    `**[${trunc(r.name, 40)}](${r.html_url})** — ⭐ ${r.stargazers_count.toLocaleString()} ${r.language ? `\`${r.language}\`` : ''}\n-# ${trunc(r.description, 80) || 'No description'}`
  ).join('\n\n');

  return [
    textDisplay(`## Repositories`),
    separator(),
    textDisplay(lines || 'No public repos'),
  ];
}

function buildLanguages(langTotals) {
  const total = Object.values(langTotals).reduce((s, b) => s + b, 0);
  if (!total) return [textDisplay(`## Languages`), separator(), textDisplay('No language data available.')];

  const sorted = Object.entries(langTotals).sort((a, b) => b[1] - a[1]);
  const lines = sorted.map(([lang, bytes]) => {
    const pct = ((bytes / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    return `**${lang}**\n\`${bar}\` ${pct}%`;
  }).join('\n\n');

  return [
    textDisplay(`## Languages`),
    separator(),
    textDisplay(lines),
  ];
}

function buildDetails(user) {
  const fields = [];
  if (user.location) fields.push(`📍 **Location:** ${trunc(user.location, 100)}`);
  if (user.company) fields.push(`🏢 **Company:** ${trunc(user.company, 100)}`);
  if (user.blog) fields.push(`🌐 **Website:** [${trunc(user.blog, 60)}](${user.blog.startsWith('http') ? user.blog : 'https://' + user.blog})`);
  if (user.twitter_username) fields.push(`🐦 **Twitter:** [@${user.twitter_username}](https://twitter.com/${user.twitter_username})`);
  if (user.email) fields.push(`📧 **Email:** ${user.email}`);
  fields.push(`🔓 **Profile type:** ${user.type}`);
  fields.push(`${user.hireable ? '✅' : '❌'} **Hireable**`);

  return [
    textDisplay(`## Details`),
    separator(),
    textDisplay(fields.length ? fields.join('\n') : 'No additional details available.'),
  ];
}

function buildActivity(user, repos) {
  const sorted = [...repos].sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  const lastPush = sorted[0] ? Math.floor(new Date(sorted[0].pushed_at).getTime() / 1000) : null;
  const mostStarred = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
  const mostForked = [...repos].sort((a, b) => b.forks_count - a.forks_count)[0];
  const created = Math.floor(new Date(user.created_at).getTime() / 1000);
  const updated = Math.floor(new Date(user.updated_at).getTime() / 1000);
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);

  const lines = [
    lastPush ? `🔄 **Last push:** <t:${lastPush}:R> — [${trunc(sorted[0].name, 40)}](${sorted[0].html_url})` : null,
    mostStarred ? `⭐ **Most starred:** [${trunc(mostStarred.name, 40)}](${mostStarred.html_url}) — ${mostStarred.stargazers_count.toLocaleString()} stars` : null,
    mostForked ? `🍴 **Most forked:** [${trunc(mostForked.name, 40)}](${mostForked.html_url}) — ${mostForked.forks_count.toLocaleString()} forks` : null,
    `⭐ **Total stars:** ${totalStars.toLocaleString()}`,
    `🍴 **Total forks:** ${totalForks.toLocaleString()}`,
    `📅 **Account created:** <t:${created}:D>`,
    `🔁 **Profile updated:** <t:${updated}:R>`,
  ].filter(Boolean).join('\n');

  return [
    textDisplay(`## Activity`),
    separator(),
    textDisplay(lines),
  ];
}

// Cache user data per interaction to avoid re-fetching on page switch
const cache = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('Get a GitHub user profile or repo info')
    .addStringOption(o =>
      o.setName('username').setDescription('GitHub username').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('repo').setDescription('Repo name (optional — shows specific repo info)').setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const username = interaction.options.getString('username').trim();
    const repo = interaction.options.getString('repo')?.trim();
    await interaction.deferReply();

    if (repo) {
      let data;
      try {
        data = await fetchRepo(username, repo);
      } catch (e) {
        if (e.response?.status === 404) return interaction.editReply({ content: `❌ Repo \`${username}/${repo}\` not found.` });
        return interaction.editReply({ content: '❌ Failed to fetch repo data.' });
      }

      const pushed = Math.floor(new Date(data.pushed_at).getTime() / 1000);
      const created = Math.floor(new Date(data.created_at).getTime() / 1000);

      const components = [
        textDisplay(`## 📦 [${trunc(data.full_name, 80)}](${data.html_url})`),
        separator(),
        textDisplay(trunc(data.description, 200) || '*No description*'),
        separator(),
        textDisplay(
          `⭐ **Stars:** ${data.stargazers_count.toLocaleString()}\n` +
          `🍴 **Forks:** ${data.forks_count.toLocaleString()}\n` +
          `🐛 **Open issues:** ${data.open_issues_count.toLocaleString()}\n` +
          `👁️ **Watchers:** ${data.watchers_count.toLocaleString()}\n` +
          `${data.language ? `💻 **Language:** ${data.language}\n` : ''}` +
          `📅 **Created:** <t:${created}:D>\n` +
          `🔄 **Last push:** <t:${pushed}:R>` +
          `${data.license ? `\n📄 **License:** ${data.license.name}` : ''}`
        ),
      ];

      if (data.homepage) {
        components.push(separator());
        components.push(textDisplay(`🌐 [${trunc(data.homepage, 60)}](${data.homepage.startsWith('http') ? data.homepage : 'https://' + data.homepage})`));
      }

      return interaction.editReply({
        flags: 1 << 15,
        components: [{
          type: 17,
          components: [...components, deleteButton(interaction.user.id)],
        }],
      });
    }

    // User profile
    let user, repos;
    try {
      ({ user, repos } = await fetchUser(username));
    } catch (e) {
      if (e.response?.status === 404) return interaction.editReply({ content: `❌ GitHub user \`${username}\` not found.` });
      return interaction.editReply({ content: '❌ Failed to fetch GitHub data.' });
    }

    // Fetch languages
    const langTotals = await fetchLanguages(repos);

    // Cache for button handler
    const cacheKey = `${username}_${interaction.user.id}`;
    cache.set(cacheKey, { user, repos, langTotals, expires: Date.now() + 15 * 60 * 1000 });

    const pageComponents = buildProfile(user, interaction.user.id);
    await interaction.editReply(buildPayload(pageComponents, username, 'profile', interaction.user.id));
  },

  async handleSelect(interaction) {
    const parts = interaction.customId.split('_'); // github_username_requesterId
    const username = parts[1];
    const requesterId = parts.slice(2).join('_');

    if (interaction.user.id !== requesterId && interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ This belongs to someone else.', flags: 64 });
    }

    const page = interaction.values[0];
    const cacheKey = `${username}_${requesterId}`;
    let cached = cache.get(cacheKey);

    if (!cached || Date.now() > cached.expires) {
      await interaction.deferUpdate();
      try {
        const { user, repos } = await fetchUser(username);
        const langTotals = await fetchLanguages(repos);
        cached = { user, repos, langTotals, expires: Date.now() + 15 * 60 * 1000 };
        cache.set(cacheKey, cached);
      } catch {
        return interaction.editReply({ content: '❌ Failed to re-fetch GitHub data.' });
      }
    } else {
      await interaction.deferUpdate();
    }

    const { user, repos, langTotals } = cached;

    let pageComponents;
    if (page === 'profile') pageComponents = buildProfile(user, requesterId);
    else if (page === 'repos') pageComponents = buildRepos(repos, requesterId);
    else if (page === 'languages') pageComponents = buildLanguages(langTotals);
    else if (page === 'details') pageComponents = buildDetails(user);
    else if (page === 'activity') pageComponents = buildActivity(user, repos);

    await interaction.editReply(buildPayload(pageComponents, username, page, requesterId));
  },
};
         
