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
    version: "1.0.2",
    role: 0,
    author: "SHAHADAT SAHU",
    shortDescription: { en: "Crush banner" },
    longDescription: { en: "Generate a crush banner image using sender and target" },
    category: "banner",
    guide: { en: "[@mention | reply]" }
  },

  onStart: async function ({ message, event }) {
    const { senderID, mentions, messageReply } = event;

    let targetID = null;
    if (messageReply?.senderID) {
      targetID = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    }

    if (!targetID) {
      return message.reply("Please reply or mention someone......");
    }

    if (senderID === targetID) {
      return message.reply("নিজেকে নিজে crush বানানো যাবে না 😅 অন্য কাউকে mention/reply করো!");
    }

    try {
      // সঠিক API লিস্ট URL (Rip.js এর মতো)
      const apiList = await axios.get(
        "https://gitlab.com/shahadat-sahu/sahu-api/-/raw/main/API.json",
        { timeout: 15000 }
      );

      const AVATAR_CANVAS_API = apiList.data.AvatarCanvas;
      if (!AVATAR_CANVAS_API) throw new Error("AvatarCanvas not found in API list");

      const res = await axios.post(
        `${AVATAR_CANVAS_API}/api`,
        { cmd: "crush2", senderID, targetID },
        { responseType: "arraybuffer", timeout: 30000 }
      );

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      const imgPath = path.join(cacheDir, `crush2_\( {senderID}_ \){Date.now()}.png`);
      await fs.writeFile(imgPath, Buffer.from(res.data));

      const caption = CRUSH2_CAPTIONS[Math.floor(Math.random() * CRUSH2_CAPTIONS.length)];

      return message.reply(
        {
          body: caption,
          attachment: fs.createReadStream(imgPath)
        },
        async () => {
          try {
            if (await fs.exists(imgPath)) await fs.unlink(imgPath);
          } catch (e) {}
        }
      );
    } catch (e) {
      console.error("Couple command error:", e.message);
      return message.reply("API Error Call Boss SAHU");
    }
  }
};

