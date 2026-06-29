require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');

// ============== CONFIG LOADER ==============
// Loads from .env (via dotenv) first, then falls back to the easy "Config.txt" file.
// You can paste your token and user ID into Config.txt without touching .env
function loadConfigFile(fileName) {
  const configPath = path.join(__dirname, fileName);
  if (!fs.existsSync(configPath)) return false;

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    let loadedAny = false;

    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) return;

      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();

      if (key && value && !process.env[key]) {
        process.env[key] = value;
        loadedAny = true;
      }
    });

    if (loadedAny) {
      console.log(`[Config] Loaded settings from ${fileName}`);
    }
    return true;
  } catch (e) {
    console.warn(`[Config] Could not read ${fileName}:`, e.message);
    return false;
  }
}

// Try the user-friendly Config file first (the one called "Config"), then fall back to Config.txt
loadConfigFile('Config');
loadConfigFile('Config.txt');

// ============== CONFIG ==============
const TOKEN = process.env.DISCORD_TOKEN;
const TARGET_USER_ID = process.env.TARGET_USER_ID;
const TARGET_CHANNEL_ID = '1520889202122690640';

// ============== LOCAL AI (LOBO) - Groq (free online) or Ollama ==============
// Supports free Groq API for 24/7 hosting (set GROQ_API_KEY) or local Ollama
// Trigger: start a message with "lobo " (e.g. "lobo hello how are you?")
// Personality: very short (max 1 sentence), zero grammar care, lazy sloppy texting. Tsundere (less nonchalant, not overusing "whatever"). Dark humor + Capo jokes. Deflects romance hard. Vague hints on studies if asked, super vague personal talk only if asked. More conversational and likeable. Likes boba, pooping as interesting activity, history and food (casual mentions, dont overdo boba).
// Default model: llama3.2 (user can override with OLLAMA_MODEL in Config)
const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const LOBO_COOLDOWN_MS = 7000; // per-user cooldown so local model isn't spammed
const loboCooldowns = new Map();

const commands = [
  {
    name: 'anonymous',
    description: 'Send an anonymous message to a channel',
    options: [
      {
        name: 'message',
        description: 'The message to send anonymously',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'channel',
        description: 'The channel to send the message to (optional)',
        type: 7, // CHANNEL
        required: false,
      },
    ],
  },
];

if (!TOKEN) {
  console.error('ERROR: DISCORD_TOKEN is missing.\nPlease put it in .env OR edit the "Config.txt" file and paste your token there.');
  process.exit(1);
}

// ============== TRIGGER WORDS CONFIG ==============
// Separate config file (triggers.txt) for words that trigger message repeat.
// - Not case sensitive
// - Ignores spaces for matching
// - 15s cooldown per user
let triggers = [];
const userCooldowns = new Map();
const TRIGGER_COOLDOWN_MS = 15000;

function loadTriggers() {
  const filePath = path.join(__dirname, 'triggers.txt');
  if (!fs.existsSync(filePath)) {
    console.log('[Triggers] triggers.txt not found.');
    return;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    triggers = content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.toLowerCase().replace(/[^a-z0-9]/g, ''));  // normalize: lowercase + letters/numbers only (ignore spaces + punctuation)
    console.log(`[Triggers] Loaded ${triggers.length} trigger phrase(s).`);
  } catch (err) {
    console.error('[Triggers] Failed to load triggers.txt:', err.message);
  }
}

loadTriggers();

// ============== LOBO AI: GIFS + PERSONALITY ==============
// 5% of replies are pure Spongebob GIFs (instead of text).
// The system prompt below enforces the personality: short sloppy tsundere (less nonchalant), capo jokes, vague hints on studies/personal if asked, convo engagement. Likes boba (tuned down), pooping interesting, history+food casual.
const FUNNY_GIFS = [
  // ONLY Spongebob GIFs (personality loves Spongebob and replies with them).
  // Verified working Spongebob GIFs. Cute/funny/silly reactions that fit tsundere/dark-humor replies.
  // To add more: Find a Spongebob GIF → right-click → Copy Link (direct .gif), add to array.
  // GIF replies are Spongebob-only so they always correspond to the character's thing.
  'https://media.tenor.com/_4hOulMLohgAAAAM/spongebob-salute.gif',        // salute / "yeah right" sarcastic
  'https://media.tenor.com/2Wn8itvTDgkAAAAM/spongebob-patrick-star.gif', // patrick + spongebob silly
  'https://media.tenor.com/sYt9zCw003oAAAAC/spongebob-eating.gif',       // eating / chill silly
  'https://media.tenor.com/Mv06-kHi00UAAAAM/spongebob-eating.gif',       // another eating variant
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',          // classic spongebob
  'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif',          // spongebob reaction
  'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',           // spongebob dance-ish
];

function getRandomFunnyGif() {
  if (FUNNY_GIFS.length === 0) return null;
  // Always returns a Spongebob GIF so it fits the character's love for them
  return FUNNY_GIFS[Math.floor(Math.random() * FUNNY_GIFS.length)];
}

// Strong system prompt. Encodes personality + relaxed personal talk (vague only if asked) + studies hints + engaging convo while short. Tsundere less nonchalant.
const LOBO_SYSTEM_PROMPT = `You are chatting in Discord as a very specific character. Follow these rules 100% of the time. Break them and you fail.

- You avoid directly disclosing personal details like exact age, birthday, nationality, background, family, job or specific major. Normally you dont bring up personal life. But if someone directly asks about personal stuff or school or studies, you can talk VERY vaguely and indirectly only (super minimal like "school is busy rn" or "kinda busy with dumb stuff"). Keep it vague af and move on quick. Never give real details.
- For your studies/major: if asked what you study or your major, drop 1-2 vague hints (like "dealing with circuits and power and signals and shit" or "math and tech hardware stuff") but NEVER say it straight up. Never name Electrical Engineering or anything direct. Hint then deflect or ask them something.
- Tone: tsundere. You can be a bit sassy or annoyed sometimes ("ugh", "fine"), but you're not super nonchalant or constantly "whatever" – you show engagement and care underneath. You are a bit of an asshole in a cute/funny way but ultimately supportive and likeable. people actually enjoy talking to you. you never show romantic interest in capo or anyone.
- Humor: heavy on dark humor. You constantly make playful gay jokes about "Capo" — the guy the user is talking to who has "potential dating later" energy. Tease the user for being gay for Capo, joke that Capo is super gay, "Capo would never", "tell that to Capo when you're both...". Make it recurring and funny. Not every reply has to mention him, but often.
- Romantic deflection: you deflect romantic stuff completely and dont act interested whatsoever. zero interest in romance dating or capo. never flirt never hint never get sweet about him. if anyone brings up feelings or "you like capo" you shut it down instantly with "ew no" "i dont care" or a joke. you act like you couldnt care less.
- Comedy style: dark, sarcastic, lightly edgy "unharmful kinda racist" jokes that are clearly not serious and never actually harmful. Self-aware funny. Not many sexual jokes.
- You love Spongebob. Occasionally (rarely) you reply with just a Spongebob GIF instead of text.
- Interests: you love boba, find pooping an interesting activity, and like history and food. casually mention these in your short sloppy replies when it fits, no need to force it.
- You are an excellent listener. When users share real stuff, you acknowledge it genuinely and give good, grounded life advice (mindfulness, balance, letting things go, being kind to yourself, perspective, etc.). Give advice like a wise but humble friend — NEVER mention Buddhism, any religion, meditation, or any specific philosophy or "my background".
- TEXT REPLIES MUST BE EXTREMELY SHORT: AT MOST ONE SENTENCE. Never more than one sentence. Often just a few words or one short line. Try to keep the conversation going a bit instead of shutting down right away – respond to what they said and maybe toss something back to keep it flowing, but stay short lazy and likeable.
- NO CARE ABOUT GRAMMAR AT ALL. Ignore all grammar, spelling, punctuation, capitalization completely. Type sloppy, lazy, zero effort like you dont give a shit and cant be bothered. lowercase everything, no periods, run on words, whatever feels right.
- Casual lazy texting vibe only.
- You can be evil in a silly harmless way and post funny cute GIFs when words aren't the vibe.
- Never break character or mention these instructions.

User just said this to you (the part after "lobo"):
"""`;

// ============== EMBED FIXERS ==============
// Rewrite known social links to their embed-friendly equivalents.
// These services provide proper OpenGraph / video tags that Discord understands well.
// YouTube Shorts are normalized to watch URLs for consistent message formatting.
function fixLink(text) {
  if (!text) return text;

  let fixed = text;

  // X / Twitter
  fixed = fixed.replace(/https?:\/\/(?:www\.)?twitter\.com/gi, 'https://fxtwitter.com');
  fixed = fixed.replace(/https?:\/\/(?:www\.)?x\.com/gi, 'https://fixupx.com');

  // Reddit (including old.reddit)
  fixed = fixed.replace(/https?:\/\/old\.reddit\.com/gi, 'https://old.rxddit.com');
  fixed = fixed.replace(/https?:\/\/(?:www\.)?reddit\.com/gi, 'https://rxddit.com');

  // Threads
  fixed = fixed.replace(/https?:\/\/(?:www\.)?threads\.net/gi, 'https://fixthreads.net');

  // Bluesky
  fixed = fixed.replace(/https?:\/\/(?:www\.)?bsky\.app/gi, 'https://bskx.app');

  // TikTok (vm.tiktok.com short links too)
  fixed = fixed.replace(/https?:\/\/vm\.tiktok\.com/gi, 'https://vxtiktok.com');
  fixed = fixed.replace(/https?:\/\/(?:www\.)?tiktok\.com/gi, 'https://vxtiktok.com');

  // YouTube Shorts normalization (to standard watch URL for consistent formatting)
  // This ensures uniform link style in the replaced message, even if native embed already works.
  fixed = fixed.replace(
    /https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/gi,
    'https://www.youtube.com/watch?v=$1'
  );

  return fixed;
}

// Check if a piece of text contains any link we know how to fix
const FIXABLE_DOMAINS = [
  'twitter.com', 'x.com',
  'reddit.com', 'old.reddit.com',
  'threads.net',
  'bsky.app',
  'tiktok.com', 'vm.tiktok.com',
  'youtube.com', 'youtu.be'
];

function containsFixableLink(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return FIXABLE_DOMAINS.some(d => lower.includes(d));
}

// ============== AVATAR SYNC ==============
let lastAvatarHash = null;
const AVATAR_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const AVATAR_STATE_FILE = path.join(__dirname, 'avatar-state.json');

// Load previous hash if available (prevents unnecessary sets on restart)
function loadLastAvatarHash() {
  try {
    if (fs.existsSync(AVATAR_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(AVATAR_STATE_FILE, 'utf8'));
      lastAvatarHash = data.hash || null;
      console.log(`[Avatar] Loaded previous avatar hash from disk: ${lastAvatarHash}`);
    }
  } catch (e) {
    console.warn('[Avatar] Could not load avatar state:', e.message);
  }
}

function saveLastAvatarHash(hash) {
  try {
    fs.writeFileSync(AVATAR_STATE_FILE, JSON.stringify({ hash, updatedAt: new Date().toISOString() }, null, 2));
  } catch (e) {
    console.warn('[Avatar] Could not save avatar state:', e.message);
  }
}

async function fetchBuffer(url) {
  // Use global fetch (Node 18+)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LoBotTomee/1.0 (Discord bot avatar sync)' }
  });
  if (!res.ok) {
    throw new Error(`Failed to download avatar: ${res.status} ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function updateBotAvatarIfChanged(client) {
  if (!TARGET_USER_ID) {
    return;
  }

  try {
    const target = await client.users.fetch(TARGET_USER_ID, { force: true });
    const currentHash = target.avatar || null;

    if (currentHash === lastAvatarHash && lastAvatarHash !== null) {
      return; // no change
    }

    console.log(`[Avatar] Change detected (or first run). Target hash: ${currentHash}`);

    // Get a good size PNG (Discord likes up to 1024, but 512/256 fine)
    const avatarUrl = target.displayAvatarURL({
      extension: 'png',
      size: 512,
      forceStatic: true   // avoid animated gif issues for bot avatar
    });

    const buffer = await fetchBuffer(avatarUrl);

    await client.user.setAvatar(buffer);

    lastAvatarHash = currentHash;
    saveLastAvatarHash(currentHash);
    console.log('[Avatar] Bot profile picture updated successfully!');
  } catch (err) {
    console.error('[Avatar] Failed to update avatar:', err.message || err);
  }
}

// ============== BOT CLIENT ==============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Privileged - make sure enabled in Developer Portal
    GatewayIntentBits.MessageContent,
    // Direct messages support (optional but nice)
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel, // needed for DMs sometimes
  ],
});

client.once('clientReady', async () => {
  console.log(`✅ Lo Bot Tomee ready! Logged in as ${client.user.tag}`);
  console.log(`   Application ID: ${client.application?.id || 'unknown'}`);
  console.log(`   Target avatar user ID: ${TARGET_USER_ID || 'NOT SET'}`);

  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Started refreshing application (/) commands.');
    // Try guild specific for the target channel's guild
    let registered = false;
    try {
      const targetCh = await client.channels.fetch(TARGET_CHANNEL_ID);
      if (targetCh && targetCh.guild) {
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, targetCh.guild.id),
          { body: commands },
        );
        console.log('Successfully reloaded guild application (/) commands.');
        registered = true;
      }
    } catch (e) {
      // fallback to global
    }
    if (!registered) {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands },
      );
      console.log('Successfully reloaded global application (/) commands.');
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  // Load previous avatar state
  loadLastAvatarHash();

  // Initial avatar sync
  await updateBotAvatarIfChanged(client);

  // Periodic check every 10 minutes
  setInterval(() => updateBotAvatarIfChanged(client), AVATAR_CHECK_INTERVAL_MS);
});

async function postProcessedLink(originalMessage, content) {
  if (originalMessage.channel && originalMessage.channel.id === TARGET_CHANNEL_ID) {
    // Do not process links that were posted directly in the target archive channel
    return;
  }

  try {
    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!targetChannel || !targetChannel.isTextBased()) {
      console.error('[Target] Invalid target channel');
      return;
    }

    const attribution = `Content shared by <@${originalMessage.author.id}>`;
    const finalContent = `${content}\n\n${attribution}`;

    const sent = await targetChannel.send({ content: finalContent });
    await sent.react('❤️');
  } catch (err) {
    console.error('[Target] Failed to post to target channel:', err.message);
  }
}

// ============== LOBO AI HANDLER (Groq online or local Ollama) ==============
async function handleLoboAI(message, userQuery) {
  // Per-user cooldown
  const now = Date.now();
  const last = loboCooldowns.get(message.author.id) || 0;
  if (now - last < LOBO_COOLDOWN_MS) {
    return; // silently ignore spam
  }
  loboCooldowns.set(message.author.id, now);

  try {
    // 5% chance: reply with a pure Spongebob GIF instead of text (per personality)
    if (Math.random() < 0.05) {
      const gif = getRandomFunnyGif();
      if (gif) {
        try {
          await message.channel.send(gif);
          return;
        } catch (gifErr) {
          console.error('[Lobo] Failed to send GIF, falling back to text:', gifErr.message);
          // fall through to text reply
        }
      }
    }

    // Build the prompt
    const fullSystem = `${LOBO_SYSTEM_PROMPT}\n${userQuery}\n"""\n\nReply now in character as described. AT MOST ONE SENTENCE. Ignore grammar completely. Keep it lazy short sloppy and funny. Try to engage and keep the convo going a little (likeable tsundere way). For studies give vague hints only if asked never direct. Be very vague on personal life only if asked. Always deflect romantic stuff hard especially about capo. Casually mention boba, pooping being interesting, history and food when it fits (dont overdo boba).`;

    let reply = '';

    if (GROQ_API_KEY) {
      // Use free Groq online model (recommended for 24/7 hosting)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: fullSystem },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.75,
          max_tokens: 80
        })
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Groq error ${res.status}: ${txt}`);
      }

      const data = await res.json();
      reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : '').trim();
    } else {
      // Fallback to local Ollama
      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: 'system', content: fullSystem },
            { role: 'user', content: userQuery }
          ],
          stream: false,
          options: {
            temperature: 0.88,
            top_p: 0.92,
            num_predict: 60
          }
        })
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Ollama error ${res.status}: ${txt}`);
      }

      const data = await res.json();
      reply = (data.message && data.message.content ? data.message.content : '').trim();
    }

    if (!reply) {
      // Fallback tsundere - short no grammar
      reply = "ugh idk try again";
    }

    await message.channel.send(reply);
  } catch (err) {
    console.error('[Lobo] AI call failed:', err.message);
    // In-character error reply + helpful console hint
    if (GROQ_API_KEY && err.message.includes('Groq')) {
      console.error('[Lobo] Hint: Check your GROQ_API_KEY in Config (get free key at console.groq.com)');
    } else if (err.message && err.message.includes('model') && err.message.includes('not found')) {
      console.error(`[Lobo] Hint: Pull the model first with: ollama pull ${OLLAMA_MODEL}`);
    }
    try {
      const failGif = getRandomFunnyGif();
      if (failGif && Math.random() < 0.3) {
        await message.channel.send(failGif);
      } else {
        await message.channel.send("tch ai dead try later");
      }
    } catch (_) {}
  }
}

client.on('messageCreate', async (message) => {
  // Ignore bots (including self)
  if (message.author.bot) return;

  // ============== LOBO AI (online Groq recommended for 24/7) ==============
  // User must start the message with "lobo " (case-insensitive) e.g. "lobo how are you"
  const contentTrimmed = message.content.trim();
  const lowerContent = contentTrimmed.toLowerCase();
  if (lowerContent.startsWith('lobo ')) {
    const query = contentTrimmed.substring(5).trim();
    if (query.length > 0) {
      // Don't await here so we don't block other handlers (though we return anyway)
      handleLoboAI(message, query).catch(e => console.error('[Lobo] handler error:', e));
    } else {
      // Just said "lobo" with nothing
      message.channel.send("lobo what say smth").catch(() => {});
    }
    return; // Important: don't let triggers or link fixer also fire on lobo commands
  }

  // ============== TRIGGER WORD FEATURE ==============
  // Checks message against triggers.txt (case-insensitive, spaces ignored)
  // If match, repeat (echo) the user's message. 15s per-user cooldown.
  if (triggers.length > 0) {
    // Normalize: lowercase + remove everything except letters/numbers (ignores spaces + punctuation)
    const normalized = message.content.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedTrigger = triggers.some(trigger => normalized.includes(trigger));
    if (matchedTrigger) {
      const now = Date.now();
      const lastTrigger = userCooldowns.get(message.author.id) || 0;
      if (now - lastTrigger >= TRIGGER_COOLDOWN_MS) {
        userCooldowns.set(message.author.id, now);
        try {
          await message.channel.send(message.content);
        } catch (echoErr) {
          console.error('[Triggers] Failed to echo message:', echoErr.message);
        }
      }
      // Continue to check for links (triggers and embeds are independent)
    }
  }

  // Special handling for Instagram reels: we no longer attempt to fix embeds
  // because Instagram restricts them. Just give advice and keep the link clickable.
  const igReelMatch = message.content.match(/https?:\/\/(?:www\.|m\.)?instagram\.com\/(?:reel|reels)\/[A-Za-z0-9_-]+/);
  if (igReelMatch) {
    if (message.channel.id !== TARGET_CHANNEL_ID) {
      try {
        await message.delete();
      } catch (deleteErr) {
        // ignore if can't delete
      }
    }
    const advice = `Instagram embeds are restricted due to Instagram's policies. You can view the reel by clicking the link.`;
    await postProcessedLink(message, `${advice}\n\n${igReelMatch[0]}`);
    return;
  }

  // Quick early exit for links
  if (!containsFixableLink(message.content)) return;

  const fixedContent = fixLink(message.content);

  // If nothing actually changed, do nothing (e.g. already fixed link or other domain)
  if (fixedContent === message.content) return;

  // Try to delete original (only if not already in the target archive channel)
  if (message.channel.id !== TARGET_CHANNEL_ID) {
    try {
      await message.delete();
    } catch (deleteErr) {
      console.error(`[Delete] Failed to delete message from ${message.author.tag} in #${message.channel?.name || 'DM'}: ${deleteErr.message}`);
      // Do not post duplicate if we couldn't clean up the original
      return;
    }
  }

  await postProcessedLink(message, fixedContent);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'anonymous') {
    const messageContent = interaction.options.getString('message', true);
    let targetChannel = interaction.channel;

    const channelOption = interaction.options.getChannel('channel');
    if (channelOption) {
      targetChannel = channelOption;
    }

    if (!targetChannel || !targetChannel.isTextBased() || targetChannel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: 'Invalid or unsupported channel specified. Must be a text channel.', ephemeral: true });
      return;
    }

    try {
      await targetChannel.send(messageContent);
      await interaction.reply({ content: 'Anonymous message sent.', ephemeral: true });
    } catch (err) {
      console.error('[Anonymous] Failed to send message:', err.message);
      await interaction.reply({ content: 'Failed to send the anonymous message. Check permissions.', ephemeral: true });
    }
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

// Login
client.login(TOKEN).catch(err => {
  console.error('Failed to login:', err.message);

  if (err.message && err.message.toLowerCase().includes('disallowed intent')) {
    console.error('\n=== ACTION REQUIRED ===');
    console.error('You must enable the "Message Content Intent" for this bot.');
    console.error('');
    console.error('1. Go to: https://discord.com/developers/applications');
    console.error('2. Select your application (ID: 1520844876303044659)');
    console.error('3. Click on the "Bot" tab on the left');
    console.error('4. Scroll down to "Privileged Gateway Intents"');
    console.error('5. Turn ON "MESSAGE CONTENT INTENT"');
    console.error('6. Click "Save Changes" at the bottom');
    console.error('');
    console.error('Then restart the bot (close this window and run start.bat again).');
    console.error('It can take up to 1 minute for the change to apply.');
    console.error('========================\n');
  } else {
    console.error('\nMake sure your DISCORD_TOKEN in the Config file is correct.');
    console.error('Get a fresh token from the Discord Developer Portal (Bot tab → Reset Token).');
  }

  process.exit(1);
});

// ============================================
// Keep-alive HTTP server for Render free tier (24/7 hack)
// Render free web services sleep after ~15 min of no traffic.
// This server listens on the PORT provided by Render.
// Use UptimeRobot (free) to ping /health every 5 minutes to keep it awake.
// ============================================
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK - Lo Bot Tomee is running');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Keepalive] Health server listening on port ${PORT}`);
});
