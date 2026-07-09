const xpConfig = require('../assets/xpConfig.json');
const { logXpEvent, getState, setState } = require('../db');

const WATER_STATE_KEY = 'last_waterer';

function extractMentionId(content) {
  const match = content.match(/<@!?(\d+)>/);
  return match ? match[1] : null;
}

function extractWateredBy(description) {
  if (!description) return null;
  const match = description.match(/Last watered by:\s*<@!?(\d+)>/);
  return match ? match[1] : null;
}

async function resolveUsername(client, userId) {
  try {
    const user = await client.users.fetch(userId);
    return user.username;
  } catch {
    return userId;
  }
}

function attachBumpListener(client) {
  const cfg = xpConfig.bump;
  if (!cfg?.botId || !cfg?.channelId || !cfg?.matchText) return; // not configured yet

  client.on('messageCreate', async message => {
    if (message.channelId !== cfg.channelId) return;
    if (message.author.id !== cfg.botId) return;
    if (!message.content.includes(cfg.matchText)) return;

    const userId = extractMentionId(message.content);
    if (!userId) return;

    const username = await resolveUsername(client, userId);

    try {
      await logXpEvent('bump', userId, username);
      console.log(`[XP] Logged bump for ${username} (${userId})`);
    } catch (err) {
      console.error('[XP] Failed to log bump:', err.message);
    }
  });
}

function attachWaterListener(client) {
  const cfg = xpConfig.water;
  if (!cfg?.botId || !cfg?.channelId || !cfg?.messageId) return; // not configured yet

  client.once('ready', async () => {
    try {
      const channel = await client.channels.fetch(cfg.channelId);
      const message = await channel.messages.fetch(cfg.messageId);
      const current = extractWateredBy(message.embeds?.[0]?.description);

      if (current) {
        const stored = await getState(WATER_STATE_KEY);
        if (!stored) {
          await setState(WATER_STATE_KEY, current);
          console.log(`[XP] Water baseline set to ${current}`);
        }
      }
    } catch (err) {
      console.error('[XP] Failed to set water baseline:', err.message);
    }
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.id !== cfg.messageId) return;
    if (newMessage.channelId !== cfg.channelId) return;

    const current = extractWateredBy(newMessage.embeds?.[0]?.description);
    if (!current) return;

    const stored = await getState(WATER_STATE_KEY);
    if (stored === current) return; // description changed, but not the waterer, ignore in this case

    const username = await resolveUsername(client, current);

    try {
      await logXpEvent('water', current, username);
      await setState(WATER_STATE_KEY, current);
      console.log(`[XP] Logged water for ${username} (${current})`);
    } catch (err) {
      console.error('[XP] Failed to log water:', err.message);
    }
  });
}

function attachXpListener(client) {
  attachBumpListener(client);
  attachWaterListener(client);
}

module.exports = { attachXpListener };
