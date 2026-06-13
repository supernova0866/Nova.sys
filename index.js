const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { TOKEN, CLIENT_ID } = require('./config');
const { initDB, isAuthorized, recordCommand, recordDenied } = require('./db');
const { handleDelete } = require('./utils/components');
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
          { type: 11, media: { url: image } },
          { type: 10, content: `-# You are not authorized to use this command.\n-# ${footer}` },
        ],
      },
    ],
  };
}

const calc = require('./commands/calc');
const define = require('./commands/define');
const time = require('./commands/time');
const { avatarCommand, bannerCommand } = require('./commands/avatarbanner');
const github = require('./commands/github');
const ascii = require('./commands/ascii');
const color = require('./commands/color');
const ship = require('./commands/ship');
const rate = require('./commands/rate');
const lyrics = require('./commands/lyrics');
const urban = require('./commands/urban');
const ratelimit = require('./commands/ratelimit');
const cats = require('./commands/cats');
const help = require('./commands/help');
const stats = require('./commands/stats');
const quote = require('./commands/quote');
const fact = require('./commands/fact');
const authorize = require('./commands/authorize');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commands = [
  calc, define, time,
  avatarCommand(), bannerCommand(),
  github, ascii, color,
  ship, rate, lyrics, urban, ratelimit,
  cats, help, stats, quote, fact,
  authorize,
];

for (const cmd of commands) {
  client.commands.set(cmd.data.name, cmd);
}

async function syncCommands() {
  const rest = new REST().setToken(TOKEN);
  const localCommands = commands.map(c => c.data.toJSON());
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

client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  await initDB();
  await syncCommands();
  await rotatePfp(client);
  setInterval(() => rotatePfp(client), PFP_INTERVAL_MS);
});

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
    await recordCommand(interaction.user.id, interaction.commandName).catch(() => {});
  } catch (err) {
    console.error(`[Error] /${interaction.commandName}:`, err);
    const msg = { content: '❌ Something went wrong running this command.', flags: 64 };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(TOKEN);
