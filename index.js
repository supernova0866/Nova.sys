const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
require('./ping');
const { TOKEN, CLIENT_ID } = require('./config');
const { initDB, isAuthorized, recordCommand, recordDenied } = require('./db');
const { handleDelete } = require('./utils/components');
const { attachXpListener } = require('./utils/xpTracker');
const unauthorizedData = require('./assets/unauthorized.json');
const imagesData = require('./assets/images.json');
const pfpData = require('./assets/pfp.json');

const PFP_INTERVAL_MS = 45 * 60 * 1000;
let lastPfp = null;

async function rotatePfp(clientRef) {
  const available = pfpData.pfps.filter(url => url !== lastPfp);
  const url = pick(available.length ? available : pfpData.pfps);
  try {
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
    await clientRef.user.setAvatar(base64);
    lastPfp = url;
    console.log(`[PFP] Rotated successfully`);
  } catch (err) {
    console.error('[PFP] Failed to rotate pfp:', err.message);
  }
}

const CATEGORIES = ['smug', 'bureaucratic', 'source', 'council', 'brainrot'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildUnauthorizedResponse() {
  const category = pick(CATEGORIES);
  const header = pick(unauthorizedData[`header_${category}`]);
  const footer = pick(unauthorizedData[`footer_${category}`]);
  const image = pick(imagesData.unauthorized);

  return {
    flags: 1 << 15,
    components: [
      {
        type: 17,
        components: [
          { type: 10, content: `## ${header}` },
          { type: 12, items: [{ media: { url: image } }] },
          { type: 10, content: `-# You are not authorized to use this command.\n-# ${footer}` },
        ],
      },
    ],
  };
}

console.log('[Boot] Loading commands...');
const calc = require('./commands/calc'); console.log('[Boot] calc OK');
const define = require('./commands/define'); console.log('[Boot] define OK');
const time = require('./commands/time'); console.log('[Boot] time OK');
const { avatarCommand, bannerCommand } = require('./commands/avatarbanner'); console.log('[Boot] avatarbanner OK');
const github = require('./commands/github'); console.log('[Boot] github OK');
const ascii = require('./commands/ascii'); console.log('[Boot] ascii OK');
const color = require('./commands/color'); console.log('[Boot] color OK');
const ship = require('./commands/ship'); console.log('[Boot] ship OK');
const rate = require('./commands/rate'); console.log('[Boot] rate OK');
const lyrics = require('./commands/lyrics'); console.log('[Boot] lyrics OK');
const urban = require('./commands/urban'); console.log('[Boot] urban OK');
const ratelimit = require('./commands/ratelimit'); console.log('[Boot] ratelimit OK');
const cats = require('./commands/cats'); console.log('[Boot] cats OK');
const help = require('./commands/help'); console.log('[Boot] help OK');
const stats = require('./commands/stats'); console.log('[Boot] stats OK');
const quote = require('./commands/quote'); console.log('[Boot] quote OK');
const fact = require('./commands/fact'); console.log('[Boot] fact OK');
const stash = require('./commands/stash'); console.log('[Boot] stash OK');
const authorize = require('./commands/authorize'); console.log('[Boot] authorize OK');
console.log('[Boot] Loading guild-only commands...');
const dump = require('./guildcommands/dump'); console.log('[Boot] dump (guild) OK');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});
client.commands = new Collection();

const commands = [
  calc, define, time,
  avatarCommand(), bannerCommand(),
  github, ascii, color,
  ship, rate, lyrics, urban, ratelimit,
  cats, help, stats, quote, fact, stash,
  authorize,
];

const guildCommands = [dump];

const validCommands = commands.filter(cmd => {
  if (!cmd?.data?.name) { console.error('[Boot] Invalid command object:', JSON.stringify(cmd)); return false; }
  return true;
});
for (const cmd of validCommands) {
  client.commands.set(cmd.data.name, cmd);
}

const validGuildCommands = guildCommands.filter(cmd => {
  if (!cmd?.data?.name) { console.error('[Boot] Invalid guild command object:', JSON.stringify(cmd)); return false; }
  if (!cmd?.guildId || cmd.guildId === 'PUT_YOUR_GUILD_ID_HERE') {
    console.error(`[Boot] Guild command "${cmd.data.name}" is missing a real guildId — skipping registration.`);
    return false;
  }
  return true;
});
for (const cmd of validGuildCommands) {
  client.commands.set(cmd.data.name, cmd);
}

async function syncCommands() {
  const rest = new REST().setToken(TOKEN);
  const localCommands = validCommands.map(c => c.data.toJSON());
  const localNames = new Set(localCommands.map(c => c.name));

  let registered;
  try {
    registered = await rest.get(Routes.applicationCommands(CLIENT_ID));
  } catch (err) {
    console.error('[Deploy] Failed to fetch registered commands:', err.message);
    return;
  }

  const registeredNames = new Set(registered.map(c => c.name));
  const missing = localCommands.filter(c => !registeredNames.has(c.name));
  const extra = registered.filter(c => !localNames.has(c.name));

  if (missing.length === 0 && extra.length === 0) {
    console.log('[Deploy] All commands up to date, skipping deploy');
    return;
  }

  console.log(`[Deploy] Changes detected — missing: [${missing.map(c => c.name).join(', ') || 'none'}], extra: [${extra.map(c => c.name).join(', ') || 'none'}]`);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: localCommands });
    console.log(`[Deploy] ✅ Registered ${localCommands.length} commands`);
  } catch (err) {
    console.error('[Deploy] ❌ Failed to register commands:', err.message);
  }
}

async function syncGuildCommands() {
  if (!validGuildCommands.length) return;

  const rest = new REST().setToken(TOKEN);

  // Group by guildId in case future guild-only commands target different servers
  const byGuild = {};
  for (const cmd of validGuildCommands) {
    (byGuild[cmd.guildId] ??= []).push(cmd.data.toJSON());
  }

  for (const [guildId, localCommands] of Object.entries(byGuild)) {
    const localNames = new Set(localCommands.map(c => c.name));

    let registered;
    try {
      registered = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, guildId));
    } catch (err) {
      console.error(`[Deploy] Failed to fetch guild commands for ${guildId}:`, err.message);
      continue;
    }

    const registeredNames = new Set(registered.map(c => c.name));
    const missing = localCommands.filter(c => !registeredNames.has(c.name));
    const extra = registered.filter(c => !localNames.has(c.name));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`[Deploy] Guild ${guildId} commands up to date, skipping deploy`);
      continue;
    }

    console.log(`[Deploy] Guild ${guildId} changes detected — missing: [${missing.map(c => c.name).join(', ') || 'none'}], extra: [${extra.map(c => c.name).join(', ') || 'none'}]`);

    try {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: localCommands });
      console.log(`[Deploy] ✅ Registered ${localCommands.length} guild commands for ${guildId}`);
    } catch (err) {
      console.error(`[Deploy] ❌ Failed to register guild commands for ${guildId}:`, err.message);
    }
  }
}

client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  await initDB();
  await syncCommands();
  await syncGuildCommands();
  await rotatePfp(client);
  setInterval(() => rotatePfp(client), PFP_INTERVAL_MS);
});

attachXpListener(client);

client.on('interactionCreate', async interaction => {
  if (interaction.isButton() && interaction.customId.startsWith('delete_')) {
    return handleDelete(interaction);
  }

  if (interaction.isButton() && interaction.customId.startsWith('lyrics_show_')) {
    return lyrics.handleShowLyrics(interaction);
  }

  if (interaction.isButton() && interaction.customId.startsWith('help_')) {
    return help.handleButton(interaction);
  }

  if (interaction.isButton() && interaction.customId.startsWith('stats_')) {
  return stats.handleButton(interaction);
  }
  
  if (interaction.isButton() && interaction.customId.startsWith('stash_page_')) {
  return stash.handleButton(interaction);
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('github_')) {
    return github.handleSelect(interaction);
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  if (interaction.commandName !== 'authorize') {
    const authed = await isAuthorized(interaction.user.id);
    if (!authed) {
      await recordDenied(interaction.user.id, interaction.commandName).catch(() => {});
      return interaction.reply(buildUnauthorizedResponse());
    }
  }

  try {
    await command.execute(interaction);
    await recordCommand(interaction.user.id, interaction.user.username, interaction.commandName).catch(() => {});
  } catch (err) {
    console.error(`[Error] /${interaction.commandName}:`, err.message);
    if (err?.rawError?.errors) {
      console.error('[Discord API errors]', JSON.stringify(err.rawError.errors, null, 2));
    }
    console.error(err.stack);
    const msg = { content: '❌ Something went wrong running this command.', flags: 64 };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(TOKEN).catch(err => {
  console.error('[Bot] Failed to log in:', err.message);
});
