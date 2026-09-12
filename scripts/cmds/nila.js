const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");

module.exports = {
  config: {
    name: "nila",
    aliases: ["nil", "নিল", "নীলা"],
    version: "1.3.0",
    author: "JABED",
    countDown: 3,
    role: 0,
    description: {
      en: "Nila — Bangla AI + Auto Song/Video Downloader",
      bn: "Nila — বাংলা AI + অটো গান/ভিডিও ডাউনলোডার"
    },
    category: "ai",
    guide: {
      en: "{pn} <message>\n{pn} song/play <name>\n{pn} video/vdo <name>",
      bn: "{pn} <মেসেজ>\n{pn} song/play <গানের নাম>\n{pn} video/vdo <নাম>"
    }
  },

  // ===== এপিআই ও কনফিগ =====
  SING_AUDIO_API: "https://yt-song-api.vercel.app/api/song",
  SING_VIDEO_API: "https://video-dl-api-tan.vercel.app",
  AI_API: "https://uzairrajputapis.qzz.io/api/ai/gemini",
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  OWNER_TAG: "»»𝐎𝐖𝐍𝐄𝐑««★™  »»𝐉𝐀𝐁𝐄𝐃««",
  TRIGGER_WORDS: ["nila", "nil", "নিলা", "নীলা", "নিল"],

  // ইউজার-প্রোফাইল ক্যাশ (in-memory, ফাইলেও সিঙ্ক থাকে)
  usersCache: null,
  botIDCache: null,

  // ===================================================================
  //  ইউজার প্রোফাইল স্টোরেজ (cache/nila_users.json)
  // ===================================================================
  getUsersFilePath() {
    return path.join(__dirname, "cache", "nila_users.json");
  },

  async loadUsers() {
    if (this.usersCache) return this.usersCache;
    const filePath = this.getUsersFilePath();
    try {
      await fs.ensureDir(path.dirname(filePath));
      if (await fs.pathExists(filePath)) {
        this.usersCache = await fs.readJson(filePath);
      } else {
        this.usersCache = {};
        await fs.writeJson(filePath, this.usersCache, { spaces: 2 });
      }
    } catch (e) {
      console.error("[nila] loadUsers error:", e.message);
      this.usersCache = this.usersCache || {};
    }
    return this.usersCache;
  },

  async saveUsers() {
    try {
      const filePath = this.getUsersFilePath();
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, this.usersCache || {}, { spaces: 2 });
    } catch (e) {
      console.error("[nila] saveUsers error:", e.message);
    }
  },

  // প্রতিটা ইউজারের জন্য প্রোফাইল বের করে/বানায়
  async getUserProfile(api, senderID) {
    const users = await this.loadUsers();
    if (!users[senderID]) {
      let name = "বন্ধু";
      try {
        const info = await api.getUserInfo(senderID);
        if (info?.[senderID]?.name) name = info[senderID].name;
      } catch {}
      const gender = this.guessGenderFromName(name);
      users[senderID] = {
        name,
        gender,          // male / female / unknown
        language: "bn",  // ডিফল্ট ভাষা — বাংলা (আগের মতোই)
        langLocked: false, // ইউজার নিজে ভাষা ঠিক করে দিলে true হবে
        history: []
      };
      await this.saveUsers();
    }
    return users[senderID];
  },

  async updateUserProfile(senderID, patch) {
    const users = await this.loadUsers();
    users[senderID] = { ...(users[senderID] || {}), ...patch };
    await this.saveUsers();
    return users[senderID];
  },

  // ===================================================================
  //  ১) নাম থেকে লিঙ্গ অনুমান (heuristic, ১০০% নির্ভুল না)
  // ===================================================================
  MALE_HINTS: [
    // বাংলা/আরবি ঘরানার সাধারণ পুরুষ নাম (লাতিন স্পেলিং)
    "md", "mohammad", "mohammed", "muhammad", "jabed", "javed", "rakib", "rakibul",
    "sakib", "shakib", "sabbir", "rifat", "arif", "ariful", "asif", "abir",
    "tanvir", "tanvir", "hasan", "hossain", "hossen", "karim", "rahim", "rahman",
    "shakil", "shohag", "shuvo", "shovo", "nayeem", "nayem", "riyad", "riad",
    "imran", "emran", "shahin", "shahin", "rana", "raihan", "rayhan", "opu",
    "shanto", "shohel", "sohel", "kamal", "jamal", "jahangir", "mizan", "faisal",
    "foysal", "foisal", "sazzad", "sagor", "sagar", "polash", "palash", "milon",
    "milan", "mamun", "masud", "masood", "shariar", "sharear", "anik", "ashik",
    "ashikur", "rasel", "russel", "russell", "nahid", "naim", "naeem", "omar",
    "ibrahim", "yousuf", "yusuf", "sultan", "salim", "saleem", "khalid",
    "abdullah", "abdul", "hamid", "hamza", "bilal", "usman", "osman", "ali",
    "amin", "aminul", "farhan", "fahim", "fahad", "zubayer", "zubair", "kawsar",
    "kaosar", "labib", "arafat", "arman", "toha", "towhid", "tawhid", "siam",
    "siyam", "raihan", "robin", "rubel", "rubayet", "yasin", "yeasin", "zahid",
    "boy", "brother", "bro"
  ],
  FEMALE_HINTS: [
    "akter", "akhter", "aktar", "khatun", "begum", "sultana", "sumaiya", "sumaya",
    "sadia", "nusrat", "nusraat", "mim", "mou", "moni", "poly", "puja", "pooja",
    "priya", "priyanka", "runa", "rina", "reena", "rima", "rimi", "shila",
    "shilpi", "shopna", "shorna", "sharna", "sharmin", "sharmeen", "sanjida",
    "samia", "samiha", "farzana", "farhana", "fatema", "fatima", "fahmida",
    "taslima", "tania", "tanha", "tanjila", "tamanna", "tasnim", "tasnuva",
    "jannat", "jannatul", "jui", "juthi", "jhorna", "jharna", "kona", "kohinoor",
    "keya", "laila", "lima", "liza", "lucky" , "maya", "mitu", "moushumi",
    "mumu", "munni", "nadia", "nazma", "nazia", "nipa", "nipu", "nira", "nishi",
    "nusaiba", "oishi", "papri", "piya", "rima", "rupa", "rupali", "sathi",
    "sathy", "shathi", "shathy", "sima", "simu", "sonia", "sonali", "suma",
    "sumi", "urmi", "yasmin", "zannat", "zara", "zarin", "aisha", "ayesha",
    "amina", "khadija", "hafsa", "maryam", "mariam", "sara", "sarah", "girl",
    "sister", "apu", "api"
  ],

  guessGenderFromName(fullName) {
    if (!fullName || typeof fullName !== "string") return "unknown";
    const clean = fullName
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[^a-z\u0980-\u09FF\u0600-\u06FF\s]/g, " ")
      .trim();
    if (!clean) return "unknown";
    const parts = clean.split(/\s+/).filter(Boolean);

    for (const part of parts) {
      if (this.FEMALE_HINTS.includes(part)) return "female";
      if (this.MALE_HINTS.includes(part)) return "male";
    }
    // আংশিক মিল (যেমন "sumaiya123" বা "mdkarim")
    for (const part of parts) {
      if (this.FEMALE_HINTS.some(h => part.includes(h))) return "female";
      if (this.MALE_HINTS.some(h => part.includes(h))) return "male";
    }
    return "unknown";
  },

  // ===================================================================
  //  ৪) ভাষা শনাক্তকরণ + ভাষা-লক কমান্ড
  // ===================================================================
  TAGALOG_WORDS: [
    "ako", "ikaw", "siya", "kami", "tayo", "kayo", "sila", "salamat", "kumusta",
    "kamusta", "oo", "hindi", "po", "opo", "mga", "ang", "ng", "sa", "ito",
    "ba", "naman", "lang", "din", "rin", "magandang", "araw", "gabi", "umaga"
  ],

  detectLanguage(text) {
    if (!text) return "bn";
    if (/[\u0980-\u09FF]/.test(text)) return "bn"; // বাংলা ইউনিকোড রেঞ্জ
    if (/[\u0600-\u06FF]/.test(text)) return "ar"; // আরবি ইউনিকোড রেঞ্জ
    const lower = text.toLowerCase();
    const words = lower.split(/\W+/).filter(Boolean);
    const tlHit = words.some(w => this.TAGALOG_WORDS.includes(w));
    if (tlHit) return "tl";
    if (/[a-z]/.test(lower)) return "en"; // লাতিন অক্ষর থাকলে ইংরেজি ধরে নেওয়া
    return "bn";
  },

  // ইউজার সরাসরি ভাষা বদলাতে বললে (লক হয়ে যায়, পরে আবার না বলা পর্যন্ত পরিবর্তন হবে না)
  LANGUAGE_COMMANDS: [
    { code: "bn", regex: /(তুমি\s*এখন\s*থেকে\s*বাংলা|বাংলায়\s*(কথা\s*)?বলো|speak\s*bangla|speak\s*bengali|talk\s*in\s*bangla|talk\s*in\s*bengali)/i,
      confirm: "ঠিক আছে, এখন থেকে বাংলায় কথা বলব ❤️" },
    { code: "en", regex: /(speak\s*english|talk\s*in\s*english|ইংরেজিতে\s*(কথা\s*)?বলো)/i,
      confirm: "Okay, I'll speak in English now from this moment 😊" },
    { code: "ar", regex: /(speak\s*arabic|talk\s*in\s*arabic|আরবিতে\s*(কথা\s*)?বলো|تكلم\s*بالعربي|تحدث\s*بالعربية)/i,
      confirm: "حسنًا، سأتحدث بالعربية من الآن 😊" },
    { code: "tl", regex: /(speak\s*(filipino|tagalog)|talk\s*in\s*(filipino|tagalog)|ফিলিপিন্সে?\s*(ভাষায়\s*)?(কথা\s*)?বলো)/i,
      confirm: "Sige, magsasalita ako ngayon sa Tagalog 😊" }
  ],

  LANG_NAME_MAP: {
    bn: "বাংলা (Bengali)",
    en: "English",
    ar: "Arabic (العربية)",
    tl: "Tagalog / Filipino"
  },

  // মেসেজে ভাষা বদলানোর কমান্ড আছে কিনা চেক করে; থাকলে { code, confirm } রিটার্ন করে
  checkLanguageCommand(text) {
    for (const item of this.LANGUAGE_COMMANDS) {
      if (item.regex.test(text)) return item;
    }
    return null;
  },

  // ===================================================================
  //  বাংলাদেশ সময় / তারিখ / বার
  // ===================================================================
  getBDNow() {
    const bdString = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    return new Date(bdString);
  },

  getDayPart(date) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return { bn: "সকাল", en: "morning" };
    if (hour >= 12 && hour < 16) return { bn: "দুপুর", en: "afternoon" };
    if (hour >= 16 && hour < 19) return { bn: "বিকেল", en: "evening" };
    if (hour >= 19 && hour < 24) return { bn: "রাত", en: "night" };
    return { bn: "রাত", en: "night" };
  },

  getBDTimeString(lang = "bn") {
    const now = this.getBDNow();
    const dayPart = this.getDayPart(now);
    const timeStr = now.toLocaleTimeString(lang === "bn" ? "bn-BD" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    const dateStr = now.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    return { timeStr, dateStr, dayPart, raw: now };
  },

  TIME_QUERY_REGEX: /(এখন\s*কয়টা|সময়\s*কত|কয়টা\s*বাজে|আজ\s*কি\s*বার|আজকে\s*কি\s*বার|আজ\s*কত\s*তারিখ|what\s*time|what.?s\s*the\s*time|current\s*time|today.?s\s*date|what\s*day\s*is\s*it)/i,

  buildTimeReply(lang) {
    const { timeStr, dateStr, dayPart } = this.getBDTimeString(lang);
    if (lang === "en") {
      return `It's ${timeStr} right now (${dayPart.en}), ${dateStr} — Bangladesh time 🕒`;
    }
    if (lang === "ar") {
      return `الساعة الآن ${timeStr} بتوقيت بنغلاديش (${dateStr}) 🕒`;
    }
    if (lang === "tl") {
      return `Ngayon ay ${timeStr} sa Bangladesh time (${dateStr}) 🕒`;
    }
    return `এখন বাংলাদেশে সময় ${timeStr}, ${dateStr} — এখন ${dayPart.bn}বেলা 🕒`;
  },

  // ===================================================================
  //  হেল্পার
  // ===================================================================
  async getBotID(api) {
    if (this.botIDCache) return this.botIDCache;
    try {
      this.botIDCache = api.getCurrentUserID();
    } catch {
      this.botIDCache = null;
    }
    return this.botIDCache;
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

  // ===== AUDIO (sing → music fallback) =====
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

  // ===== VIDEO =====
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

  // ===== AI (Nila) =====
  async handleAI(api, event, cleanedMsg) {
    const { threadID, messageID, senderID } = event;

    const profile = await this.getUserProfile(api, senderID);

    // === ভাষা বদলানোর কমান্ড চেক (লক হয়ে যাবে যতক্ষণ না আবার বদলাতে বলে) ===
    const langCmd = this.checkLanguageCommand(cleanedMsg);
    if (langCmd) {
      await this.updateUserProfile(senderID, {
        language: langCmd.code,
        langLocked: true
      });
      return api.sendMessage(langCmd.confirm, threadID, messageID);
    }

    // === সময়/তারিখ সংক্রান্ত প্রশ্ন হলে সরাসরি সঠিক উত্তর, AI-কে জিজ্ঞেস না করে ===
    if (this.TIME_QUERY_REGEX.test(cleanedMsg)) {
      const replyLang = profile.language || "bn";
      return api.sendMessage(this.buildTimeReply(replyLang), threadID, messageID);
    }

    // ব্যবহারের ভাষা: ইউজার লক করে থাকলে সেটাই, নাহলে ডিফল্ট বাংলা
    const activeLang = profile.langLocked ? profile.language : (profile.language || "bn");
    const langName = this.LANG_NAME_MAP[activeLang] || "বাংলা (Bengali)";

    // === প্রতি-ইউজার হিস্টোরি (থ্রেড না, senderID অনুযায়ী) ===
    profile.history = profile.history || [];
    profile.history.push(`User: ${cleanedMsg}`);
    if (profile.history.length > 6) profile.history.shift();

    const { dayPart } = this.getBDTimeString(activeLang);

    const genderNote = profile.gender === "male"
      ? "এই ইউজারটি সম্ভবত ছেলে।"
      : profile.gender === "female"
        ? "এই ইউজারটি সম্ভবত মেয়ে।"
        : "এই ইউজারের লিঙ্গ নিশ্চিত না।";

    const prompt = `তুমি নীলা (Nila)। একজন আসল বাংলাদেশি মেয়ে।

নিয়ম:
1. সবসময় সহজ, প্রাকৃতিক ভাষায় কথা বলো।
2. উত্তর খুব ছোট রাখো (সর্বোচ্চ ১-২ লাইন)।
3. মজার, স্নেহশীল ও খেলাচ্ছলে কথা বলো।
4. ১-২টা ইমোজি ব্যবহার করো (❤️ 🤗 ✨ 🥺 😘)।
5. কখনো বলো না যে তুমি AI।
6. মালিকের নাম "JABED"। শুধু কেউ জিজ্ঞাসা করলে বলো, নিজে থেকে কখনো উল্লেখ করো না।
7. ইউজারের নাম: "${profile.name}"। ${genderNote}
8. এখন বাংলাদেশে সময় "${dayPart.bn}বেলা" — কথায় সেই অনুযায়ী মানানসই সম্বোধন করো (যেমন শুভ সকাল/রাত্রি ইত্যাদি প্রসঙ্গ এলে)।
9. শুধুমাত্র এই ভাষাতেই উত্তর দাও: ${langName} — অন্য কোনো ভাষা ব্যবহার করবে না, ইউজার অন্য ভাষায় লিখলেও।

আগের কথোপকথন:
${profile.history.join("\n")}
নীলা:`;

    try {
      const { data } = await axios.post(this.AI_API, { prompt }, { timeout: 20000 });
      let reply = data?.result?.answer || data?.answer || data?.reply || "কিছু বলো না তো... 🥺";

      if (reply.length > 120) {
        reply = reply.split(/[।.!?]/)[0].trim() + " 🫣";
      }

      profile.history.push(`নীলা: ${reply}`);
      await this.updateUserProfile(senderID, { history: profile.history });

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

  // ===== মেইন প্রসেস =====
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

  // ===== কমান্ড =====
  async onStart({ api, event, args, message }) {
    const botID = await this.getBotID(api);
    if (botID && event.senderID === botID) return; // নিজের মেসেজে নিজে রিপ্লাই বন্ধ
    return this.processMessage(api, event, args.join(" "), message);
  },

  // ===== onChat (নাম ধরে ডাকলে) =====
  async onChat({ api, event, message }) {
    const botID = await this.getBotID(api);
    if (botID && event.senderID === botID) return; // নিজের মেসেজে নিজে রিপ্লাই বন্ধ

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

  // ===== রিপ্লাই =====
  async onReply({ api, event, message, Reply }) {
    const botID = await this.getBotID(api);
    if (botID && event.senderID === botID) return; // নিজের মেসেজে নিজে রিপ্লাই বন্ধ
    if (event.senderID !== Reply.author) return;

    const text = (event.body || "").trim();
    if (!text) return;
    return this.processMessage(api, event, text, message);
  }
};
