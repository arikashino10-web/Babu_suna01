const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// Album API base
const getBaseApi = async () => {
  try {
    const res = await axios.get(
      "https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json",
      { timeout: 10000 }
    );
    return res.data.api;
  } catch (e) {
    return null;
  }
};

// Album ক্যাটাগরি লিস্ট (যেখান থেকে র‍্যান্ডম নিবে)
const CATEGORIES = [
  { type: "funny",     name: "Funny Video",      emoji: "🤣" },
  { type: "islamic",   name: "Islamic Video",    emoji: "😇" },
  { type: "sad",       name: "Sad Video",        emoji: "🥺" },
  { type: "anime",     name: "Anime Video",      emoji: "😘" },
  { type: "cartoon",   name: "Cartoon Video",    emoji: "🐾" },
  { type: "lofi",      name: "LoFi Video",       emoji: "🎧" },
  { type: "love",      name: "Couple/Love Video",emoji: "😍" },
  { type: "flower",    name: "Flower Video",     emoji: "🌹" },
  { type: "photo",     name: "Random Photo",     emoji: "🖼️" },
  { type: "aesthetic", name: "Aesthetic Video",  emoji: "🌌" },
  { type: "sigma",     name: "Sigma Rule",       emoji: "🦁" },
  { type: "lyrics",    name: "Lyrics Video",     emoji: "🎶" },
  { type: "cat",       name: "Cat Video",        emoji: "🐱" },
  { type: "ff",        name: "Free Fire Video",  emoji: "🎮" },
  { type: "football",  name: "Football Video",   emoji: "⚽" },
  { type: "girl",      name: "Girl Video",       emoji: "👧" },
  { type: "friend",    name: "Friends Video",    emoji: "🤝" },
  { type: "cricket",   name: "Cricket Video",    emoji: "🏏" }
];

module.exports = {
  config: {
    name: "random",
    version: "13.0.0",
    role: 0,
    author: "Connected with Album",
    shortDescription: { en: "Random media from Album categories" },
    longDescription: { en: "Sends random photo/video from different album categories each time" },
    category: "media",
    guide: {
      en: "{pn} - random media\n{pn} list - show categories"
    }
  },

  onStart: async function ({ message, event, args }) {
    // লিস্ট দেখতে চাইলে
    if ((args[0] || "").toLowerCase() === "list") {
      let txt = "🎵 Album Categories (Random picks from these)\n\n";
      CATEGORIES.forEach((c, i) => {
        txt += `${i + 1}. ${c.emoji} ${c.name}\n`;
      });
      return message.reply(txt);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    // র‍্যান্ডম ক্যাটাগরি সিলেক্ট
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    try {
      await message.reply(`🎲 Random picking... ${cat.emoji} ${cat.name}`);

      const base = await getBaseApi();
      if (!base) {
        return message.reply("❌ Album API পাওয়া যায়নি। একটু পর চেষ্টা করুন।");
      }

      // Album API থেকে মিডিয়া নেওয়া
      const res = await axios.get(`\( {base}/album?type= \){cat.type}`, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const mediaUrl = res.data?.data;
      if (!mediaUrl || typeof mediaUrl !== "string") {
        return message.reply(`❌ ${cat.name} থেকে মিডিয়া পাওয়া যায়নি। আবার চেষ্টা করুন।`);
      }

      // ডাউনলোড
      const mediaRes = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        timeout: 40000,
        maxContentLength: 45 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!mediaRes.data || mediaRes.data.byteLength < 5000) {
        return message.reply("❌ ফাইল নষ্ট বা খুব ছোট। আবার চেষ্টা করুন।");
      }

      // এক্সটেনশন ঠিক করা
      let ext = ".mp4";
      if (mediaUrl.match(/\.(jpg|jpeg|png|webp)(\?|$)/i) || cat.type === "photo") {
        ext = ".jpg";
      } else if (mediaUrl.match(/\.(gif)(\?|$)/i)) {
        ext = ".gif";
      }

      const filePath = path.join(cacheDir, `random_album_\( {Date.now()} \){ext}`);
      await fs.writeFile(filePath, Buffer.from(mediaRes.data));

      await message.reply({
        body: `${cat.emoji} 𝗥𝗮𝗻𝗱𝗼𝗺 ${cat.name}\n\n🎯 Category: ${cat.type}\n♻️ প্রতিবার আলাদা আসবে`,
        attachment: fs.createReadStream(filePath)
      });

      try { await fs.unlink(filePath); } catch (e) {}

    } catch (err) {
      console.error("Random+Album Error:", err.message);
      return message.reply(
        `❌ সমস্যা হয়েছে (${cat.name})\n` +
        `কারণ: ${err.message || "Unknown"}\n` +
        `আবার .random দিন।`
      );
    }
  }
};
