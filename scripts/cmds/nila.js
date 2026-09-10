const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");

module.exports = {
  config: {
    name: "nila",
    aliases: ["nil","nilu","নিল", "নীলা"],
    version: "1.3.0",
    author: "JABED",
    countDown: 3,
    role: 0,
    description: {
      en: "Nila — Bangla AI + Auto Song/Video Downloader (per-user memory, gender & language aware)",
      bn: "Nila — বাংলা AI + অটো গান/ভিডিও ডাউনলোডার (প্রতি ইউজারের আলাদা মেমোরি, লিঙ্গ ও ভাষা শনাক্তকারী)"
    },
    category: "ai",
    guide: {
      en: "{pn} <message>\n{pn} song/play <name>\n{pn} video/vdo <name>",
      bn: "{pn} <মেসেজ>\n{pn} song/play <গানের নাম>\n{pn} video/vdo <নাম>"
    }
  },

  // ===================== কনফিগ / কনস্ট্যান্ট =====================

  SING_AUDIO_API: "https://yt-song-api.vercel.app/api/song",
  SING_VIDEO_API: "https://video-dl-api-tan.vercel.app",
  AI_API: "https://uzairrajputapis.qzz.io/api/ai/gemini",
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  OWNER_TAG: "»»𝐎𝐖𝐍𝐄𝐑««★™  »»𝐉𝐀𝐁𝐄𝐃««",
  TRIGGER_WORDS: ["nila", "nil", "নিলা", "নীলা", "নিল"],
  MAX_HISTORY: 8, // প্রতি ইউজারের সর্বোচ্চ কতগুলো লাইন মনে রাখবে

  // ===================== প্রতি-ইউজার মেমোরি (ফাইলে persist) =====================
  // গঠন: { [senderID]: { name, gender, language, history: [], updatedAt } }
  _usersCache: null,

  getUsersFilePath() {
    return path.join(__dirname, "cache", "nila_users.json");
  },

  async loadUsers() {
    if (this._usersCache) return this._usersCache;
    const filePath = this.getUsersFilePath();
    try {
      await fs.ensureDir(path.dirname(filePath));
      if (await fs.pathExists(filePath)) {
        this._usersCache = await fs.readJson(filePath);
      } else {
        this._usersCache = {};
      }
    } catch (e) {
      console.log("[nila] loadUsers error:", e.message);
      this._usersCache = {};
    }
    return this._usersCache;
  },

  async saveUsers() {
    const filePath = this.getUsersFilePath();
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, this._usersCache || {}, { spaces: 2 });
    } catch (e) {
      console.log("[nila] saveUsers error:", e.message);
    }
  },

  async getUserProfile(senderID) {
    const users = await this.loadUsers();
    if (!users[senderID]) {
      users[senderID] = {
        name: null,
        gender: "unknown",
        language: null,
        history: [],
        updatedAt: Date.now()
      };
    }
    return users[senderID];
  },

  async updateUserProfile(senderID, patch) {
    const users = await this.loadUsers();
    users[senderID] = { ...(users[senderID] || {}), ...patch, updatedAt: Date.now() };
    await this.saveUsers();
    return users[senderID];
  },

  // ===================== লিঙ্গ অনুমান (নাম থেকে হিউরিস্টিক) =====================
  // ছোট ডিকশনারি — দরকার অনুযায়ী নাম যোগ/বিয়োগ করা যাবে।
  MALE_HINTS: [
    "md", "mohammad", "mohammed", "rahim", "karim", "hasan", "hossain", "islam",
    "ahmed", "rafiq", "shakil", "sohel", "rakib", "arif", "kamal", "jamal",
    "mahmud", "jabed", "imran", "tanvir", "nayeem", "fahim", "sajib", "shahin",
    "ali", "omar", "yusuf", "ibrahim", "khan", "raju", "babu", "sagor"
  ],
  FEMALE_HINTS: [
    "akter", "aktar", "begum", "sultana", "khatun", "fatema", "fatima",
    "nila", "nusrat", "sumaiya", "moni", "priya", "tania", "rima", "mim",
    "jannat", "arifa", "sadia", "nadia", "mou", "papiya", "shova", "lima",
    "rupa", "urmi", "eva", "esha", "mitu", "liza"
  ],

  guessGenderFromName(fullName) {
    if (!fullName) return "unknown";
    const lower = fullName.toLowerCase();
    const tokens = lower.split(/\s+/);

    for (const t of tokens) {
      if (this.FEMALE_HINTS.includes(t)) return "female";
    }
    for (const t of tokens) {
      if (this.MALE_HINTS.includes(t)) return "male";
    }
    // আংশিক মিল (substring) — শেষ চেষ্টা
    for (const hint of this.FEMALE_HINTS) {
      if (lower.includes(hint)) return "female";
    }
    for (const hint of this.MALE_HINTS) {
      if (lower.includes(hint)) return "male";
    }
    return "unknown";
  },

  async resolveUserNameAndGender(api, senderID, profile) {
    // ইতিমধ্যে নাম/লিঙ্গ জানা থাকলে আবার API কল করার দরকার নেই
    if (profile.name && profile.gender) return profile;

    try {
      const info = await api.getUserInfo(senderID);
      const userInfo = info?.[senderID];
      const name = userInfo?.name || userInfo?.firstName || null;
      const gender = this.guessGenderFromName(name);
      await this.updateUserProfile(senderID, { name, gender });
      return await this.getUserProfile(senderID);
    } catch (e) {
      console.log("[nila] resolveUserNameAndGender error:", e.message);
      return profile;
    }
  },

  // ===================== ভাষা শনাক্তকরণ =====================
  TAGALOG_HINTS: [
    "ako", "ikaw", "siya", "kami", "tayo", "kayo", "sila", "kumusta",
    "salamat", "po", "opo", "hindi", "oo", "ang", "mga", "ng", "naman",
    "paano", "saan", "bakit", "ganda", "mahal", "kita", "ba"
  ],

  detectLanguage(text) {
    if (!text) return null;
    // ইউনিকোড রেঞ্জ চেক
    if (/[\u0980-\u09FF]/.test(text)) return "bn"; // বাংলা
    if (/[\u0600-\u06FF]/.test(text)) return "ar"; // আরবি

    const lower = text.toLowerCase();
    const words = lower.split(/[^a-z]+/).filter(Boolean);
    if (words.length) {
      const hitCount = words.filter(w => this.TAGALOG_HINTS.includes(w)).length;
      if (hitCount >= 1 && hitCount / words.length >= 0.15) return "tl"; // Filipino/Tagalog
    }

    if (/[a-zA-Z]/.test(text)) return "en"; // ইংরেজি (ডিফল্ট ল্যাটিন)
    return null; // অনিশ্চিত হলে আগের ভাষাই বজায় থাকবে
  },

  langName(code) {
    return { bn: "বাংলা", ar: "আরবি (Arabic)", en: "ইংরেজি (English)", tl: "Filipino/Tagalog" }[code] || "বাংলা";
  },

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
    if (p && fs.existsSync(p)) {
      try { await fs.unlink(p); } catch {}
    }
  },

  async searchYT(query) {
    try {
      const s = await yts(query);
      if (s.videos?.[0]) {
        return {
          url: s.videos[0].url,
          title: s.videos[0].title,
          videoId: s.videos[0].videoId
        };
      }
    } catch {}
    return null;
  },

  async getMahmudBase() {
    try {
      const { data } = await axios.get(
        "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json",
        { timeout: 10000 }
      );
      return data.mahmud || data.api;
    } catch {
      return "https://mahmud-apis.vercel.app";
    }
  },

  // ===================== AUDIO (sing → music fallback) =====================
  async downloadAudio(api, event, query) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let filePath = null;

    api.setMessageReaction("⌛", messageID, () => {}, true);

    // 1st try: SING
    try {
      const { data } = await axios.get(this.SING_AUDIO_API, {
        params: { q: `${query} official` },
        timeout: 45000
      });
      const audioUrl = data?.download || data?.audio_url;
      if (data?.success && audioUrl) {
        const ext = ["mp3", "m4a"].includes(data.format) ? data.format : "mp3";
        filePath = path.join(cacheDir, `nila_${senderID}_${Date.now()}.${ext}`);
        const res = await axios.get(audioUrl, {
          responseType: "stream",
          timeout: 90000
        });
        await pipeline(
          res.data,
          this.fileSizeGuard(this.MAX_FILE_SIZE),
          fs.createWriteStream(filePath)
        );
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage({
          body: `${this.OWNER_TAG}\n\n🎵 এই নাও তোমার গান\n➡️ ${data.title || query}`,
          attachment: fs.createReadStream(filePath)
        }, threadID, async () => {
          await this.removeFile(filePath);
        }, messageID);
      }
    } catch (e) {
      console.log("[nila] SING fail → trying MUSIC", e.message);
    }

    // 2nd try: MUSIC
    try {
      const base = await this.getMahmudBase();
      const res = await axios.get(
        `${base}/api/song/mahmud?query=${encodeURIComponent(query)}`,
        { responseType: "stream", timeout: 60000 }
      );
      filePath = path.join(cacheDir, `nila_${senderID}_${Date.now()}.mp3`);
      await pipeline(res.data, fs.createWriteStream(filePath));
      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage({
        body: `${this.OWNER_TAG}\n\n🎵 এই নাও তোমার গান\n➡️ ${query}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, async () => {
        await this.removeFile(filePath);
      }, messageID);
    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("মাফ করো, গানটা পাওয়া যায়নি 🥺", threadID, messageID);
    }
  },

  // ===================== VIDEO =====================
  async downloadVideo(api, event, query) {
    const { threadID, messageID, senderID } = event;
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let filePath = null;

    api.setMessageReaction("⌛", messageID, () => {}, true);

    try {
      const info = await this.searchYT(query);
      if (!info) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage("মাফ করো, ভিডিওটা পাওয়া যায়নি 🥺", threadID, messageID);
      }

      filePath = path.join(cacheDir, `nila_${senderID}_${Date.now()}.mp4`);
      const streamUrl = `${this.SING_VIDEO_API}/stream?url=${encodeURIComponent(info.url)}&type=video&quality=720`;
      const res = await axios.get(streamUrl, {
        responseType: "stream",
        timeout: 90000
      });
      await pipeline(
        res.data,
        this.fileSizeGuard(this.MAX_FILE_SIZE),
        fs.createWriteStream(filePath)
      );

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage({
        body: `${this.OWNER_TAG}\n\n🎬 এই নাও তোমার ভিডিও\n➡️ ${info.title}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, async () => {
        await this.removeFile(filePath);
      }, messageID);
    } catch (err) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      await this.removeFile(filePath);
      return api.sendMessage("ভিডিও ডাউনলোড হয়নি 🥺", threadID, messageID);
    }
  },

  // ===================== AI (Nila) =====================
  async handleAI(api, event, cleanedMsg) {
    const { threadID, messageID, senderID } = event;

    const profile = await this.getUserProfile(senderID);
    await this.resolveUserNameAndGender(api, senderID, profile);
    const freshProfile = await this.getUserProfile(senderID);

    // এই মেসেজের ভাষা শনাক্ত করে ইউজারের প্রোফাইলে লক করে রাখা
    const detected = this.detectLanguage(cleanedMsg);
    const language = detected || freshProfile.language || "bn";
    if (detected && detected !== freshProfile.language) {
      await this.updateUserProfile(senderID, { language: detected });
    }

    // প্রতি ইউজারের নিজস্ব হিস্টোরি (মিক্সিং হবে না)
    const history = freshProfile.history || [];
    history.push(`User: ${cleanedMsg}`);
    if (history.length > this.MAX_HISTORY) history.shift();

    const genderNote =
      freshProfile.gender === "male" ? "এই ইউজারটি একজন ছেলে।" :
      freshProfile.gender === "female" ? "এই ইউজারটি একজন মেয়ে।" :
      "এই ইউজারের লিঙ্গ নিশ্চিত না — নিরপেক্ষভাবে কথা বলো।";

    const nameNote = freshProfile.name ? `ইউজারের নাম: ${freshProfile.name}।` : "";

    const prompt = `তুমি নীলা (Nila)। একজন আসল বাংলাদেশি মেয়ে।

নিয়ম:
1. এখন এই ইউজারের সাথে শুধুমাত্র "${this.langName(language)}" ভাষায় কথা বলবে, অন্য কোনো ভাষা মেশাবে না।
2. উত্তর ছোট রাখো (সর্বোচ্চ ১-২ লাইন)।
3. রোমান্টিক, কাছের মানুষ,মজার,স্নেহশীল ও খেলাচ্ছলে কথা বলো।
4. ১-২টা ইমোজি ব্যবহার করো (❤️ 🤗 ✨ 🥺 😘 🫶 ❤️‍🩹 😭 🫣)।
5. কখনো বলো না যে তুমি AI।
6. মালিকের নাম "JABED"। শুধু কেউ জিজ্ঞাসা করলে বলো, নিজে থেকে কখনো উল্লেখ করো না।
7. ${genderNote} ${nameNote} এই তথ্য অনুযায়ী স্বাভাবিকভাবে সম্বোধন করো (যেমন উপযুক্ত সম্বোধন/pronoun), কিন্তু জোর করে বারবার নাম বা লিঙ্গ উল্লেখ করার দরকার নেই।

এই নির্দিষ্ট ইউজারের সাথে আগের কথোপকথন (অন্য কারো সাথে মেশানো নেই):
${history.join("\n")}
নীলা:`;

    try {
      const { data } = await axios.post(this.AI_API, { prompt }, { timeout: 20000 });
      let reply = data?.result?.answer || data?.answer || data?.reply || "কিছু বলো না তো... 🥺";

      if (reply.length > 120) {
        reply = reply.split(/[।.!?]/)[0].trim() + " 🫣";
      }

      history.push(`নীলা: ${reply}`);
      await this.updateUserProfile(senderID, { history });

      return api.sendMessage(reply, threadID, (err, info) => {
        if (!err && info) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            author: senderID,
            messageID: info.messageID
          });
        }
      }, messageID);
    } catch (e) {
      console.error("[nila AI]", e.message);
      return api.sendMessage("নেটের সমস্যা, একটু পরে চেষ্টা করো 🥺", threadID, messageID);
    }
  },

  // ===================== মেইন প্রসেস =====================
  async processMessage(api, event, text, message) {
    const cleanedMsg = text.trim();
    if (!cleanedMsg) return message.reply("বলো তো, কী চাও? 😘");

    const isVideo = /\b(video|vdo|mp4|ভিডিও)\b/i.test(cleanedMsg);
    const isAudio = /\b(song|music|audio|mp3|play|গান)\b/i.test(cleanedMsg);

    let query = cleanedMsg
      .replace(/\b(video|vdo|mp4|ভিডিও|song|music|audio|mp3|play|গান|nila|nil|নিলা|নীলা|নিল)\b/gi, "")
      .trim();

    if (isVideo) {
      if (!query) return message.reply("ভিডিওর নামটা বলো তো 🥺");
      return this.downloadVideo(api, event, query);
    }

    if (isAudio) {
      if (!query) return message.reply("গানের নামটা বলো তো 🥺");
      return this.downloadAudio(api, event, query);
    }

    return this.handleAI(api, event, cleanedMsg);
  },

  // ===================== কমান্ড =====================
  async onStart({ api, event, args, message }) {
    // বট নিজের মেসেজে নিজে রিপ্লাই করবে না
    const botID = api.getCurrentUserID?.();
    if (botID && event.senderID === botID) return;

    return this.processMessage(api, event, args.join(" "), message);
  },

  // ===================== onChat (নাম ধরে ডাকলে) =====================
  async onChat({ api, event, message }) {
    const botID = api.getCurrentUserID?.();
    if (botID && event.senderID === botID) return; // নিজের মেসেজে নিজে রিপ্লাই না

    const body = (event.body || "").toLowerCase().trim();
    if (!body) return;

    const triggered = this.TRIGGER_WORDS.some(word =>
      body.includes(word.toLowerCase())
    );
    if (!triggered) return;

    // প্রিফিক্স কমান্ড হলে ডাবল রেসপন্স বন্ধ
    const prefix = global.GoatBot?.config?.prefix || ".";
    if (body.startsWith(prefix)) return;

    return this.processMessage(api, event, event.body, message);
  },

  // ===================== রিপ্লাই =====================
  async onReply({ api, event, message, Reply }) {
    const botID = api.getCurrentUserID?.();
    if (botID && event.senderID === botID) return; // নিজের মেসেজে নিজে রিপ্লাই না

    if (event.senderID !== Reply.author) return;
    const text = (event.body || "").trim();
    if (!text) return;
    return this.processMessage(api, event, text, message);
  }
};
