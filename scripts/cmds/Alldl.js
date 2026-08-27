const axios = require("axios");
const fs = require("fs");

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
  return base.data.mahmud69;
};

module.exports = {
  config: {
    name: "alldl",
    aliases: ["downloaddd", "dlll"],
    version: "1.7",
    author: "乛 SIYAM ゎ",
    countDown: 10,
    role: 0,
    description: {
      en: "Download videos from any social media"
    },
    category: "media",
    guide: {
      en: "   {pn} <link>: Provide the video link"
        + "\n   Or reply to a link with {pn}"
    }
  },

  langs: {
    en: {
      noLink: "× Baby, please provide a valid video link or reply to one!",
      error: "× Download error: %1"
    }
  },

  onStart: async function ({ api, message, args, event, getLang }) {
    const mahmud = args[0] || event.messageReply?.body;

    if (!mahmud || !mahmud.startsWith("http")) {
      return message.reply(getLang("noLink"));
    }

    const supportedSites = [
      "tiktok.com", "youtube.com", "youtu.be", "twitter.com",
      "x.com", "facebook.com", "fb.watch", "instagram.com",
      "tumblr.com", "threads.net", "spotify.com", "soundcloud.com",
      "snapchat.com", "reddit.com", "pinterest.com", "pin.it",
      "linkedin.com", "kuaishou.com", "kwai.com", "douyin.com",
      "dailymotion.com", "dai.ly", "capcut.com", "bsky.app"
    ];

    if (!supportedSites.some(site => mahmud.includes(site))) {
      return message.reply(getLang("noLink"));
    }

    const cacheFolder = __dirname + "/cache";
    if (!fs.existsSync(cacheFolder)) fs.mkdirSync(cacheFolder);
    const path = `\( {cacheFolder}/alldl_ \){Date.now()}.mp4`;

    try {
      api.setMessageReaction("🪶", event.messageID, () => {}, true);

      const base = await baseApiUrl();
      const apiUrl = `\( {base}/api/download?url= \){encodeURIComponent(mahmud)}`;

      const apiRes = await axios.get(apiUrl);

      if (!apiRes.data || !apiRes.data.result) {
        throw new Error("Failed to fetch video URL from API");
      }

      const videoUrl = apiRes.data.result;

      const response = await axios({
        method: "get",
        url: videoUrl,
        responseType: "arraybuffer"
      });

      fs.writeFileSync(path, Buffer.from(response.data, "binary"));

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      return message.reply({
        attachment: fs.createReadStream(path)
      }, () => {
        if (fs.existsSync(path)) fs.unlinkSync(path);
      });

    } catch (err) {
      console.error("Error in alldl command:", err);
      api.setMessageReaction("❎", event.messageID, () => {}, true);
      if (fs.existsSync(path)) fs.unlinkSync(path);
      return message.reply(getLang("error", err.message));
    }
  }
};
