const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");

const BOT_ID = "YOUR_BOT_ID_HERE"; // তোমার বটের senderID

module.exports = {
  config: {
    name: "nila",
    aliases: ["nil","nilu","নিল","নীলু","নিলু","নীলা"],
    version: "1.4.0",
    author: "JABED",
    countDown: 3,
    role: 0,
    description: {
      en: "Nila — Bangla AI + Auto Song/Video (per-user memory, gender & time aware)",
      bn: "Nila — বাংলা AI + অটো গান/ভিডিও (প্রতি ইউজারের আলাদা মেমোরি, লিঙ্গ, সময়)"
    },
    category: "ai",
    guide: {
      en: "{pn} <message>\n{pn} song/play <name>\n{pn} video/vdo <name>",
      bn: "{pn} <মেসেজ>\n{pn} song/play <গানের নাম>\n{pn} video/vdo <নাম>"
    }
  },

  // ===================== কনস্ট্যান্ট =====================
  SING_AUDIO_API: "https://yt-song-api.vercel.app/api/song",
  SING_VIDEO_API: "https://video-dl-api-tan.vercel.app",
  AI_API: "https://uzairrajputapis.qzz.io/api/ai/gemini",
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  OWNER_TAG: "»»𝐎𝐖𝐍𝐄𝐑««★™  »»𝐉𝐀𝐁𝐄𝐃««",
  TRIGGER_WORDS: ["nila", "nil", "নিলা", "নীলা", "নিল"],
  MAX_HISTORY: 8,

  // ===================== ইমোজি (যেমন আগের ফাইল থেকে) =====================
  EMOJI_GROUPS: {
    sad: { emojis: ["😭", "🥲", "🥹", "🤕", "😿", "🥺", "❤️‍🩹"], keywords: ["কষ্ট", "দুঃখ", "মন খারাপ", "কাঁদ", "একা", "ব্যথা", "মিস", "ভুলে", "ছেড়ে"] },
    love: { emojis: ["❤️", "😘", "🫶", "💕"], keywords: ["ভালোবাস", "প্রিয়", "জান", "সোনা", "কাছে", "আদর", "মায়া"] },
    shy: { emojis: ["🙈", "🫣", "😅"], keywords: ["লজ্জা", "হিহি", "ইশ", "ছি", "দুষ্টু"] },
    happy: { emojis: ["😊", "✨", "🤗", "🌸", "😌"], keywords: ["হাসি", "মজা", "খুশি", "সুন্দর", "ভালো লাগ", "হাহা"] }
  },
  DEFAULT_EMOJIS: ["😊", "🤗", "✨"],

  pickEmojisForText(text, count) {
    const lower = (text || "").toLowerCase();
    let matchedPool = [];
    for (const group of Object.values(this.EMOJI_GROUPS)) {
      if (group.keywords.some(k => lower.includes(k))) matchedPool.push(...group.emojis);
    }
    if (matchedPool.length === 0) matchedPool = [...this.DEFAULT_EMOJIS];
    matchedPool = [...new Set(matchedPool)];
    const picked = [];
    const pool = [...matchedPool];
    for (let i = 0; i < count && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked.join(" ");
  },

  // ===================== সময় চেনা =====================
  getBDNow() { return new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }); },
  getBDTimeString() {
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    const [timePart, datePart] = now.split(", ");
    return { timeStr: timePart, dateStr: datePart };
  },
  getDayPart(hour24) {
    if (hour24 < 5) return "গভীর রাত";
    if (hour24 < 12) return "সকাল";
    if (hour24 < 17) return "দুপুর/বিকেল";
    if (hour24 < 20) return "সন্ধ্যা";
    return "রাত";
  },
  TIME_QUERY_REGEX: /(এখন\s*কয়টা|কয়টা\s*বাজে|সময়\s*কত|আজ\s*কি\s*বার|what\s*time|current\s*time)/i,
  isDateQuery(text) { return /তারিখ|বার|date/i.test(text); },

  // ===================== ইউজার ডাটাবেস =====================
  _usersCache: null,
  getUsersFilePath() { return path.join(__dirname, "cache", "nila_users.json"); },

  async loadUsers() {
    if (this._usersCache) return this._usersCache;
    const filePath = this.getUsersFilePath();
    await fs.ensureDir(path.dirname(filePath));
    this._usersCache = (await fs.pathExists(filePath)) ? await fs.readJson(filePath) : {};
    return this._usersCache;
  },

  async saveUsers() {
    const filePath = this.getUsersFilePath();
    try {
      await fs.writeJson(filePath, this._usersCache || {}, { spaces: 2 });
    } catch {}
  },

  async getUserProfile(senderID) {
    const users = await this.loadUsers();
    if (!users[senderID]) {
      users[senderID] = { name: null, gender: "unknown", language: "bn", history: [], updatedAt: Date.now() };
    }
    return users[senderID];
  },

  async updateUserProfile(senderID, patch) {
    const users = await this.loadUsers();
    users[senderID] = { ...(users[senderID] || {}), ...patch, updatedAt: Date.now() };
    await this.saveUsers();
    return users[senderID];
  },

  // ===================== লিঙ্গ চেনা =====================
  MALE_HINTS: ["jabed", "rakib", "sohel", "arif", "hasan", "fahad", "amin", "rahim", "karim", "ali", "omar", "yusuf"],
  FEMALE_HINTS: ["jannat", "nila", "moon", "rina", "popy", "nazia", "sadia", "farhana", "shorna", "lima", "eva", "esha", "mitu", "rupa"],

  guessGenderFromName(fullName) {
    const lower = (fullName || "").toLowerCase();
    for (const m of this.MALE_HINTS) if (lower.includes(m)) return "male";
    for (const f of this.FEMALE_HINTS) if (lower.includes(f)) return "female";
    return "unknown";
  },

  async resolveUserNameAndGender(api, senderID, profile) {
    if (profile.name && profile.gender) return profile;
    try {
      const info = await api.getUserInfo(senderID);
      const name = info?.[senderID]?.name || null;
      const gender = this.guessGenderFromName(name);
      await this.updateUserProfile(senderID, { name, gender });
      return await this.getUserProfile(senderID);
    } catch {
      return profile;
    }
  },

  // ===================== ভাষা শনাক্তকরণ =====================
  detectLanguage(text) {
    if (!text) return "bn";
    if (/[\u0980-\u09FF]/.test(text)) return "bn";
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    if (/\b(ako|ikaw|siya|kami|tayo|kayo|sila|kumusta|salamat|po|opo|hindi|oo|ang|ganda|mahal|kita)\b/i.test(text)) return "tl";
    return "en";
  },

  // ===================== ভিডিও/গান (যেমন আছে) =====================
  fileSizeGuard(maxBytes) {
    let received = 0;
    return new Transform({
      transform(chunk, _, cb) {
        received += chunk.length;
        if (received > maxBytes) {
          const e = new Error("File too large");
          e.code = "TOO_LARGE";
          return cb(e);
        }
        cb(null, chunk);
      }
    });
  },

  async removeFile(p) {
    if (p && fs.existsSync(p)) await fs.unlink(p).catch(() => {});
  },

  async searchYT(query) {
    try {
      const s = await yts(query);
      return s.videos?.[0] ? { url: s.videos[0].url, title: s.videos[0].title } : null;
    } catch { return null; }
  },

  async getMahmudBase() {
    try {
      const { data } = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json", { timeout: 10000 });
      return data.mahmud || data.api;
    } catch { return "https://mahmud-apis.vercel.app"; }
  },

  async downloadAudio(api, event, query) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let filePath = null;
    api.setMessageReaction("⌛", messageID, () => {}, true);

    try {
      const { data } = await axios.get(this.SING_AUDIO_API, { params: { q: `${query} official` }, timeout: 45000 });
      if (data?.success && data?.download) {
        filePath = path.join(cacheDir, `nila_\( {senderID}_ \){Date.now()}.mp3`);
        const res = await axios.get(data.download, { responseType: "stream", timeout: 90000 });
        await pipeline(res.data, this.fileSizeGuard(this.MAX_FILE_SIZE), fs.createWriteStream(filePath));
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage(`${this.OWNER_TAG}\n\n🎵 এই নাও তোমার গান\n➡️ ${data.title || query}`, threadID, async () => { await this.removeFile(filePath); }, messageID);
      }
    } catch {}

    try {
      const base = await this.getMahmudBase();
      const res = await axios.get(`\( {base}/api/song/mahmud?query= \){encodeURIComponent(query)}`, { responseType: "stream", timeout: 60000 });
      filePath = path.join(cacheDir, `nila_\( {senderID}_ \){Date.now()}.mp3`);
      await pipeline(res.data, fs.createWriteStream(filePath));
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(`${this.OWNER_TAG}\n\n🎵 এই নাও তোমার গান\n➡️ ${query}`, threadID, async () => { await this.removeFile(filePath); }, messageID);
    } catch {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("মাফ করো, গানটা পাওয়া যায়নি 🥺", threadID, messageID);
    }
  },

  async downloadVideo(api, event, query) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let filePath = null;
    api.setMessageReaction("⌛", messageID, () => {}, true);

    try {
      const info = await this.searchYT(query);
      if (!info) return api.sendMessage("মাফ করো, ভিডিওটা পাওয়া যায়নি 🥺", threadID, messageID);

      filePath = path.join(cacheDir, `nila_\( {senderID}_ \){Date.now()}.mp4`);
      const streamUrl = `\( {this.SING_VIDEO_API}/stream?url= \){encodeURIComponent(info.url)}&type=video&quality=720`;
      const res = await axios.get(streamUrl, { responseType: "stream", timeout: 90000 });
      await pipeline(res.data, this.fileSizeGuard(this.MAX_FILE_SIZE), fs.createWriteStream(filePath));
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage(`${this.OWNER_TAG}\n\n🎬 এই নাও তোমার ভিডিও\n➡️ ${info.title}`, threadID, async () => { await this.removeFile(filePath); }, messageID);
    } catch {
      api.setMessageReaction("❌", messageID, () => {}, true);
      await this.removeFile(filePath);
      return api.sendMessage("ভিডিও ডাউনলোড হয়নি 🥺", threadID, messageID);
    }
  },

  // ===================== AI (লিঙ্গ + সময় + ডাটাবেস চালু) =====================
  async handleAI(api, event, cleanedMsg) {
    const { threadID, messageID, senderID } = event;
    const profile = await this.getUserProfile(senderID);
    await this.resolveUserNameAndGender(api, senderID, profile);
    const freshProfile = await this.getUserProfile(senderID);

    if (this.TIME_QUERY_REGEX.test(cleanedMsg)) {
      const { timeStr, dateStr } = this.getBDTimeString();
      const baseReply = this.isDateQuery(cleanedMsg) ? `আজ ${dateStr}` : `এখন ${timeStr}`;
      const finalReply = `${baseReply} ${this.pickEmojisForText(baseReply, 1)}`;
      const history = freshProfile.history || [];
      history.push(`User: ${cleanedMsg}`, `নীলা: ${finalReply}`);
      if (history.length > this.MAX_HISTORY) history.splice(0, this.MAX_HISTORY);
      await this.updateUserProfile(senderID, { history });
      return api.sendMessage(finalReply, threadID, (err, info) => {
        if (!err && info) global.GoatBot.onReply.set(info.messageID, { commandName: this.config.name, author: senderID, messageID: info.messageID });
      }, messageID);
    }

    const detectedLang = this.detectLanguage(cleanedMsg);
    if (detectedLang !== freshProfile.language) {
      await this.updateUserProfile(senderID, { language: detectedLang });
    }

    const history = freshProfile.history || [];
    history.push(`User: ${cleanedMsg}`);
    if (history.length > this.MAX_HISTORY) history.shift();

    const genderNote = freshProfile.gender === "male" ? "এই ইউজার একজন ছেলে।" : "এই ইজার একজন মেয়ে।";
    const prompt = `তুমি নীলা (Nila)। একজন আসল বাংলাদেশি মেয়ে।

১. শুধুমাত্র "${this.langName(freshProfile.language)}" ভাষায় কথা বলো।
২. উত্তর খুব ছোট রাখো।
৩. রোমান্টিক, কাছের মানুষ, মজার, স্নেহশীল ও খেলাচ্ছলে কথা বলো।
৪. কখনো বলো না যে তুমি AI।
৫. মালিকের নাম "JABED"।
৬. বর্তমান সময় (বাংলাদেশ): ${this.getBDTimeString().timeStr}। প্রাসঙ্গিক হলে এটা মাথায় রেখো।

এই ইউজারের আগের কথোপকথন:
${history.join("\n")}
নীলা:`;

    try {
      const { data } = await axios.post(this.AI_API, { prompt }, { timeout: 20000 });
      let reply = data?.result?.answer || data?.answer || "কিছু বলো না তো...";
      if (reply.length > 120) reply = reply.split(/[।.!?]/)[0].trim();

      const emojis = this.pickEmojisForText(reply, Math.random() < 0.5 ? 1 : 2);
      reply = `${reply} ${emojis}`.trim();

      history.push(`নীলা: ${reply}`);
      await this.updateUserProfile(senderID, { history });

      return api.sendMessage(reply, threadID, (err, info) => {
        if (!err && info) global.GoatBot.onReply.set(info.messageID, { commandName: this.config.name, author: senderID, messageID: info.messageID });
      }, messageID);
    } catch {
      return api.sendMessage("নেটের সমস্যা, একটু পরে চেষ্টা করো 🥺", threadID, messageID);
    }
  },

  async processMessage(api, event, text, message) {
    const cleanedMsg = text.trim();
    const { senderID, threadID, messageID } = event;

    if (senderID === BOT_ID) return;

    const isVideo = /\b(video|vdo|mp4|ভিডিও)\b/i.test(text);
    const isAudio = /\b(song|music|audio|mp3|play|গান|গান)\b/i.test(text);
    let query = text.replace(/\b(video|vdo|mp4|ভিডিও|song|music|audio|mp3|play|গান|গান|nila|nil|নিলা|নীলা|নিল)\b/gi, "").trim();

    if (isVideo) {
      if (!query) return message.reply("ভিডিওর নামটা বলো তো 🥺");
      return this.downloadVideo(api, event, query);
    }
    if (isAudio) {
      if (!query) return message.reply("গানের নামটা বলো তো 🥺");
      return this.downloadAudio(api, event, query);
    }

    return this.handleAI(api, event, text);
  },

  async onStart({ api, event, args, message }) {
    return this.processMessage(api, event, args.join(" "), message);
  },

  async onChat({ api, event, message }) {
    if (event.senderID === BOT_ID) return;
    const body = (event.body || "").toLowerCase();
    if (!this.TRIGGER_WORDS.some(w => body.includes(w))) return;
    return this.processMessage(api, event, event.body, message);
  },

  async onReply({ api, event, message, Reply }) {
    if (event.senderID !== Reply.author || event.senderID === BOT_ID) return;
    return this.processMessage(api, event, event.body, message);
  }
};
