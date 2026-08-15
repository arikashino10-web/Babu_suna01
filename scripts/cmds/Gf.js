const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "gf",
    version: "1.0.1",
    role: 0,
    author: "SHAHADAT SAHU",
    shortDescription: { en: "couple banner" },
    longDescription: { en: "Generate a girlfriend couple banner image using sender and target" },
    category: "banner",
    guide: { en: "[@mention | reply]" }
  },

  onStart: async function ({ message, event, args }) {
    const { senderID, mentions, messageReply } = event;

    let targetID = messageReply?.senderID || (mentions && Object.keys(mentions)[0]);

    if (!targetID) {
      return message.reply("Please reply or mention someone......");
    }

    try {
      const apiList = await axios.get("https://gitlab.com");
      const AVATAR_CANVAS_API = apiList.data.AvatarCanvas;
      
      if (!AVATAR_CANVAS_API) throw true;

      const res = await axios.post(
        `${AVATAR_CANVAS_API}/api`,
        { cmd: "gf", senderID, targetID },
        { responseType: "arraybuffer", timeout: 30000 }
      );

      // ক্যাশ ডিরেক্টরি নিখুঁতভাবে তৈরি বা চেক করা
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) {
        fs.ensureDirSync(cacheDir);
      }

      const imgPath = path.join(cacheDir, `gf_${senderID}_${targetID}.png`);
      fs.writeFileSync(imgPath, res.data);

      return message.reply({
        body: "~এই নে তোর গার্লফ্রেন্ড অন্য মেয়ের দিকে নজর দিস না 😍😸",
        attachment: fs.createReadStream(imgPath)
      }, () => {
        try { fs.unlinkSync(imgPath); } catch(e) {}
      });

    } catch (e) {
      return message.reply("GF API Error | SAHU-API unreachable");
    }
  }
};
