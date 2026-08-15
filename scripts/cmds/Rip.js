const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "rip",
    version: "1.0.0",
    role: 0,
    author: "SHAHADAT SAHU",
    shortDescription: { en: "Generate a RIP banner image" },
    longDescription: { en: "Generate a RIP banner image using target Facebook UID via Avatar Canvas API" },
    category: "banner",
    guide: { en: "[@mention | reply]" }
  },

  onStart: async function ({ message, event }) {
    const { senderID, mentions, messageReply } = event;

    let targetID = messageReply ? messageReply.senderID : (mentions && Object.keys(mentions).length > 0 ? Object.keys(mentions) : null);

    if (!targetID) {
      return message.reply("Please reply or mention someone......");
    }

    try {
      const apiList = await axios.get("https://gitlab.com/shahadat-sahu/sahu-api/-/raw/main/API.json");
      const AVATAR_CANVAS_API = apiList.data.AvatarCanvas;

      const res = await axios.post(
        `${AVATAR_CANVAS_API}/api`,
        {
          cmd: "rip",
          senderID: targetID
        },
        { responseType: "arraybuffer", timeout: 30000 }
      );

      // ক্যাশ ডিরেক্টরি পারফেক্টলি হ্যান্ডেল করা
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) {
        fs.ensureDirSync(cacheDir);
      }

      const imgPath = path.join(cacheDir, `rip_${targetID}.png`);
      fs.writeFileSync(imgPath, res.data);

      // আপনার বটের আসল নিয়ম অনুযায়ী ইমেজ রেসপন্স পাঠানো
      return message.reply({
        body: "Rest In Peace 😭⚰️",
        attachment: fs.createReadStream(imgPath)
      }, () => {
        try { fs.unlinkSync(imgPath); } catch(e) {}
      });

    } catch (e) {
      return message.reply("API Error Call Boss SAHU");
    }
  }
};
