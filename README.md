# Lo Bot Tomee

A Discord bot that fixes video embeds from social media links (X/Twitter, Instagram, Reddit, YouTube, Threads, Bluesky, TikTok, and more) so they play inline properly in Discord.

It automatically:
- Detects supported video/social links in messages
- Deletes the original message
- Reposts the link using the best embed fixer domain for rich video/image embeds
- Credits the original sharer: "Content shared by @User"
- Reacts with ❤️ to the posts it makes (so people can like shared content)
- Has an optional trigger word system (see below)
- Has a local AI you can chat with by starting messages with `lobo ` (runs via Ollama, short engaging tsundere (less nonchalant) personality + Spongebob GIFs, vague hints on personal stuff only if asked; likes boba, pooping interesting, history + food)

Additionally, it keeps its profile picture in sync with the Discord user `@you_look_like_you_love_me` (checks every 10 minutes and updates when the avatar changes).

> **IMPORTANT — How to start the bot**
>
> **DO NOT double-click `index.js`** — Windows will try to run it with the old "Windows Script Host" (JScript) instead of Node.js and you will get a Syntax Error.
>
> **Correct ways to run:**
>
> **Easiest method:**
> 1. Edit the file called **`Config`** (or `Config.txt`) and paste your real Discord token + target user ID
> 2. Double-click **`start.bat`** (or `start-bot.cmd`)
>
> **From terminal (recommended if launcher closes too fast):**
> Open PowerShell or CMD → `cd ~\LoBotTomee` → then type:
> ```powershell
> node index.js
> ```
>
> If `node` is not recognized, restart your terminal (or your PC) after installing Node.js.

All processed social media links (after fixing where applicable) are now sent to the central archive channel (ID: 1520889202122690640).

## Supported Platforms (Embed Fixers)

- **X / Twitter**: `fxtwitter.com` / `fixupx.com`
- **Instagram**: No longer attempts to fix embeds (Instagram restricts this due to their policies). When a reel link is posted, the bot advises the user that embeds are restricted and provides the original link to click. A ❤️ reaction is still added to the message.
- **Reddit**: `rxddit.com` (and old.rxddit)
- **Threads**: `fixthreads.net`
- **Bluesky**: `bskx.app`
- **TikTok**: `vxtiktok.com` (also handles vm.tiktok links)
- **YouTube**: Shorts are normalized to standard `watch?v=` URLs for consistent formatting (embeds already work, but formatting is applied for uniformity)

More can be added easily.

## Commands

- `/anonymous <message>` — Send an anonymous message in the current channel.
- `/anonymous <channel> <message>` — Send an anonymous message to the specified channel.

The message is sent by the bot with no user attribution.

## Talking to the bot ("lobo" AI)

The bot has a built-in AI triggered by starting messages with `lobo `.

**How to use:**
- Start any message with `lobo ` (lowercase or uppercase, space after)
- Examples:
  - `lobo hello how are you?`
  - `lobo tell me a joke`
  - `lobo what should I do about my friend being annoying`

It supports **free online AI** (recommended for 24/7 hosting) via Groq — get a free API key at https://console.groq.com (llama-3.3-70b-versatile is excellent and has generous free limits). Falls back to local Ollama if no key. The personality is:
- Tsundere (sassy/annoyed sometimes but not super nonchalant or overusing "whatever"), funny, dark-humored and likeable in a bratty way
- Replies are very short (at most one sentence) with zero care about grammar, punctuation or proper writing — super lazy sloppy texting style
- Tries to actually have short conversations (engages a bit, keeps it flowing) instead of pure deflection
- Loves sending Spongebob GIFs (~5% of the time it will just reply with a Spongebob GIF instead of text)
- Makes recurring gay jokes about "Capo" but completely deflects romantic stuff and never acts interested in him or anyone whatsoever
- Gives super vague indirect hints about studies or personal life only if directly asked (never direct details)
- Likes boba (tuned down, not obsessed), finds pooping an interesting activity, likes history and food (brings up casually when it fits)
- Good listener + gives solid life advice when needed (without ever revealing anything personal about "herself") — but still keeps it to one sentence max

**For 24/7 hosting: Use the free Groq online model** (see below) — no need to run Ollama on the server.

## Setup

### Prerequisites
- Node.js 18+ (LTS recommended)
- (Optional for local testing) **Ollama** — completely free & local
  - Download from https://ollama.com
  - `ollama pull llama3.2`
- **For 24/7 hosting (recommended):** Free Groq API key
  - Go to https://console.groq.com/keys
  - Sign up (free) and create an API key (very generous free tier with rate limits — fine for personal use)
- A Discord account + server where you can add bots

### 1. Get your bot ready in Discord
1. Go to https://discord.com/developers/applications
2. Use / select the existing app with:
   - Application ID: `1520844876303044659`
3. Go to **Bot** section:
   - Set the **Username** to `Lo Bot Tomee` (this is what people will see)
   - Create / reset your **Bot Token** (copy it)
   - Enable **Privileged Gateway Intents**:
     - Presence Intent (optional)
     - Server Members Intent (optional)
     - **MESSAGE CONTENT INTENT** ← REQUIRED (we fixed this in code)
4. Go to **OAuth2 > URL Generator**:
   - Scopes: `bot`
   - Bot Permissions:
     - Send Messages
     - Manage Messages (to delete original link messages)
     - Read Message History (recommended)
   - Or use this direct invite link (recommended permissions):
     https://discord.com/oauth2/authorize?client_id=1520844876303044659&permissions=93184&scope=bot
     (This gives View Channels, Send Messages, Manage Messages, Embed Links, and Read Message History)
   - **Important**: If you see "integration requires code grant", see the troubleshooting section at the bottom of this README.
   - During the invite flow, make sure you select the correct server and click "Authorize".
   - After inviting, the bot should appear in your server's member list (it may take a few seconds to go online).
   - You can also generate a custom link in the Developer Portal under OAuth2 → URL Generator.

### 2. Install and configure
Open PowerShell or Command Prompt and run:

```powershell
cd ~\LoBotTomee
npm install
```

### 3. Add your token and user ID (Easiest method)

Open the file called **`Config`** (or `Config.txt`) in the folder.

Replace the two placeholder lines with your real values:

- `DISCORD_TOKEN=PASTE_YOUR_REAL_DISCORD_TOKEN_HERE`
- `TARGET_USER_ID=PASTE_THE_USER_ID_HERE`

**For online AI (recommended for hosting):**
- `GROQ_API_KEY=your_groq_key_here`   (get free at console.groq.com)
- `GROQ_MODEL=llama-3.3-70b-versatile`   (optional, other free Groq models work too)

⚠️ **Never share your GROQ_API_KEY or the Config file.**

**For local Ollama only:**
- `OLLAMA_MODEL=llama3.2`
- `OLLAMA_BASE=http://127.0.0.1:11434` (only if different)

Save the file.

You can also use `.env` if you prefer (advanced). The separate `Config` file is the easiest for most people.

**Important**: Never share Config.txt or .env with anyone. The token is secret.

### 4. Run the bot (IMPORTANT)

**Never double-click index.js directly.**

**Recommended method:**
- Double-click **`start.bat`** (or `start-bot.cmd`)

These launchers check for Node.js, check your Config file, and keep the window open even if the bot crashes.

**Strongly recommended if .bat files close immediately:**
1. Go into the `LoBotTomee` folder.
2. Click in the address bar at the top, type `powershell` and press Enter.
3. In the PowerShell window type exactly:
   ```powershell
   node index.js
   ```
This almost never closes by itself and will show you the real error message.

**Alternative:**
```powershell
npm start
```

### Troubleshooting: "integration requires code grant"

This error happens when the "Requires OAuth2 Code Grant" setting is turned on in the Discord Developer Portal.

**Fix:**
1. Go to https://discord.com/developers/applications
2. Select your application (ID: 1520844876303044659)
3. In the left menu, click **Bot**
4. Scroll down to **"Integration Requires Code Grant"** (or "Requires OAuth2 Code Grant")
5. Turn the toggle **OFF**
6. Save changes
7. Use the invite link again (make sure to pick your server in the popup)

After disabling it, the simple `scope=bot` invite link will work normally.

The bot will log in, sync the avatar on start, and begin listening for links.

### Trigger Words Feature

Create/edit `triggers.txt` in the bot folder (one trigger per line).

- Matching is **not case sensitive** and **ignores spaces + punctuation** (only letters and numbers are considered).
- Example: trigger `hello world` will match "HelloWorld", "h e l l o   w o r l d!", "HELLO-WORLD"
- When a message contains a trigger, the bot will **repeat (echo) the exact message** the user sent.
- 15 second cooldown per user (to avoid spam).

Example `triggers.txt`:
```
hello
iloveyou
lobottomee
```

You can add as many as you want. The file is loaded when the bot starts.

### Local AI ("lobo") Troubleshooting (only if using Ollama)

If `lobo ...` does nothing or you see "model 'xxx' not found":

1. Make sure Ollama is installed and running (`ollama list`).
2. Pull your model: `ollama pull llama3.2` (or the one you want).
3. Set `OLLAMA_MODEL=llama3.2` (exactly matching `ollama list` output) in Config/Config.txt.
4. Restart the bot.
5. First responses can be slow while the model loads into memory.

If GIFs don't appear or are broken links:
- Open `index.js`, find `FUNNY_GIFS`. Replace or add fresh direct Spongebob .gif links.
- All GIF-mode replies use Spongebob GIFs (the character's favorite) so they always "make sense" as part of the personality. No random unrelated preloaded GIFs.

The AI is 100% local — nothing is sent to OpenAI or any cloud service.

For keeping it running 24/7, you can use PM2:
```powershell
npm install -g pm2
pm2 start index.js --name "lo-bot-tomee"
pm2 save
pm2 startup
```

## Hosting the Bot 24/7 for Free (Recommended)

To have the bot run 24/7 without your computer on:

### Easiest Free Option: Render.com + UptimeRobot (free tier)

1. Push your code to a public or private GitHub repository (do **not** commit your Config or .env with secrets).
2. Go to [render.com](https://render.com) and sign up (free).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repo.
5. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
6. Add these **Environment Variables**:
   - `DISCORD_TOKEN` = your token
   - `GROQ_API_KEY` = your free Groq key
   - `TARGET_USER_ID` = (if using avatar sync)
7. Deploy. Render will give you a URL like `https://your-bot.onrender.com`.
8. Go to [uptimerobot.com](https://uptimerobot.com) (free account), create a "HTTP(s)" monitor for your Render URL, set it to ping every 5 minutes.
9. This keeps the service awake on Render's free tier.

Your bot will now run 24/7.

### Best Always-On Option: Oracle Cloud Always Free Tier

- Create a free Oracle Cloud account (always-free resources, no credit card for the free tier).
- Provision a free **Ampere A1** instance (4 cores, 24 GB RAM — more than enough).
- SSH in, install Node.js, clone your repo, set up your Config with `GROQ_API_KEY`.
- Run with PM2 as above.
- It will stay up 24/7 with no sleeping.

Other options: Koyeb (free tier), Fly.io.

**Groq Free Limits Note**: The free tier on Groq is quite generous for a personal bot. If you hit limits, lobo commands will temporarily fail (the rest of the bot keeps working).

## Grok xBuild - Fast Iteration + Cloud Deploy Workflow

This setup lets you rapidly iterate with me:

1. You describe what to change or add (e.g. "iterate: add a command that does X" or "fix the greeting to be funnier").
2. I edit the code directly.
3. I commit and push the changes.
4. The cloud host automatically detects the push, deploys the new version, and restarts the bot.
5. Your 24/7 hosted bot is updated with the changes (usually in 1-3 minutes).

### One-time Setup (Required)

**A. Initialize and push to GitHub**

In your terminal (in the project folder):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/lo-bot-tomee.git
git branch -M main
git push -u origin main
```

(First create the repo on GitHub with the same name, public or private.)

**B. Connect to a cloud host with auto-deploy**

**Recommended: Railway (great for Discord bots)**

1. Go to [railway.app](https://railway.app), sign in with GitHub.
2. New Project → Deploy from GitHub repo.
3. Select your repo.
4. It will deploy.
5. Go to Variables tab and add:
   - `DISCORD_TOKEN`
   - `GROQ_API_KEY`
   - `TARGET_USER_ID` (optional)

Railway will auto-deploy on every future push.

**Alternative: Render.com** (as described in the Hosting section above).

Once connected, every time I push, it redeploys automatically.

### How to Iterate

Just tell me things like:
- "iterate: add support for Threads links"
- "make the lobo personality more sassy"
- "add a cooldown to the anonymous command"

I will make the code changes, commit, and push. The cloud version updates automatically.

This keeps your bot live 24/7 in the cloud while we rapidly build and test.

## How it works

- On every `messageCreate`, scans for URLs.
- If a URL matches a supported site, the entire message is deleted (requires Manage Messages permission).
- A new message is sent with:
  - All supported links rewritten to their embed-friendly versions
  - Original text preserved (if any)
  - `Content shared by @User` attribution
- The rewritten link makes Discord pull the correct video-capable embed from the fixer service.

## Avatar Sync

- Every 10 minutes the bot fetches the target user's current avatar.
- If the hash changed, it downloads the PNG avatar and calls `setAvatar`.
- Works across restarts (first run will apply current avatar).

The target user must exist and be fetchable by ID (works globally with a valid ID; no mutual guild strictly required for user fetch).

## Commands / Future

Currently fully automatic (no slash commands needed).

Possible future:
- Per-server toggle (`/fixer enable/disable`)
- Manual fix via context menu or `/fix`
- Configurable fixer preference
- Support more sites (Pixiv, Tumblr, etc.)

## Permissions Note

The bot **must** have "Manage Messages" in channels where you want auto-replacement to work. Without it, it will skip processing to avoid duplicate posts.

## Development

```bash
npm start
```

Logs will show login, avatar updates, and any delete/send errors.

## Credits

Embed fixers are community services (fxtwitter/FixTweet, zzinstagram, toinstagram, kkinstagram, fxreddit, fixthreads, VixBluesky, vxtiktok, etc.). They do the hard work of providing good metadata for Discord.
Note: Instagram embeds are no longer fixed (see above).

## License

ISC / whatever you want. Have fun sharing videos that actually play!
