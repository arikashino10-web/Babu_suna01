const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const CRUSH2_CAPTIONS = [
`💛🌻
তোমার নামটা শুনলেই
মনটা কেমন জানি হালকা হয়ে যায় 🙂
এই অনুভূতিটাই হয়তো Crush 🫶`,

`🫶💛
চুপচাপ তাকিয়ে থাকি,
কারণ চোখের ভাষায়
সব বলা যায় না 🌼
Crush 💛`,

`🌻💛
ভালোবাসা না হয় পরে,
এই ভালো লাগাটুকু
এখনই খুব দামী 🫶`,

`💛🙂
তুমি জানো না,
কিন্তু তোমার একটা হাসিই
কারো পুরো দিন ভালো করে দেয় 🌸`,

`🫶🌼
তোমাকে পাওয়ার দাবি নেই,
শুধু মনে মনে
একটু ভালোবাসি 💛`,

`🌼💛
এই অনুভূতিটার কোনো নাম হয় না,
তবুও সবাই একে
Crush বলেই চেনে 🫶`,

`💛🌸
একটা মানুষ,
একটা অনুভূতি,
আর অজান্তেই
ভালো লেগে যাওয়া 🙂`
];

module.exports = {
  config: {
    name: "couple",
    version: "1.0.0",
    role: 0,
    author: "SHAHADAT SAHU",
    longDescription: "Generate a crush banner image using sender and target Facebook UID via Avatar Canvas API",
    category: "banner",
    guide: {
      en: "[@mention | reply]"
    }
  },

  onStart: async function ({ event, api, args }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    let targetID = null;

    if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (messageReply && messageReply.senderID) {
      targetID = messageReply.senderID;
    }

    if (!targetID) {
      return api.sendMessage(
        "Please reply or mention someone......",
        threadID,
        messageID
      );
    }

    try {
      const apiList = await axios.get(
        "https://gitlab.com/shahadat-sahu/sahu-api/-/raw/main/API.json"
      );

      const AVATAR_CANVAS_API = apiList.data.AvatarCanvas;

      const res = await axios.post(
        `${AVATAR_CANVAS_API}/api`,
        {
          cmd: "crush2",
          senderID,
          targetID
        },
        { responseType: "arraybuffer", timeout: 30000 }
      );

      // নিশ্চিত করার জন্য ক্যাশ ডিরেক্টরি তৈরি করা
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) {
        fs.ensureDirSync(cacheDir);
      }

      const imgPath = path.join(
        cacheDir,
        `crush2_${senderID}_${targetID}.png`
      );

      fs.writeFileSync(imgPath, res.data);

      const caption =
        CRUSH2_CAPTIONS[Math.floor(Math.random() * CRUSH2_CAPTIONS.length)];

      return api.sendMessage(
        {
          body: caption,
          attachment: fs.createReadStream(imgPath)
        },
        threadID,
        () => {
          try {
            fs.unlinkSync(imgPath);
          } catch(e) {}
        },
        messageID
      );

    } catch (error) {
      return api.sendMessage(
        "API Error Call Boss SAHU",
        threadID,
        messageID
      );
    }
  }
};
