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
একতু ভালোবাসি 💛`,

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
    shortDescription: { en: "Crush banner" },
    longDescription: { en: "Generate a crush banner image using sender and target" },
    category: "banner",
    guide: { en: "[@mention | reply]" }
  },

  onStart: async function ({ message, event, args }) {
    const { senderID, mentions, messageReply } = event;
    let targetID = messageReply ? messageReply.senderID : (mentions && Object.keys(mentions).length > 0 ? Object.keys(mentions)[0] : null);
    
    if (!targetID) return message.reply("Please reply or mention someone......");

    try {
      const apiList = await axios.get("https://gitlab.com");
      const res = await axios.post(`${apiList.data.AvatarCanvas}/api`, { cmd: "crush2", senderID, targetID }, { responseType: "arraybuffer" });
      
      const imgPath = path.join(__dirname, `crush2_${senderID}.png`);
      fs.writeFileSync(imgPath, res.data);
      
      const caption = CRUSH2_CAPTIONS[Math.floor(Math.random() * CRUSH2_CAPTIONS.length)];
      
      return message.reply({ 
        body: caption, 
        attachment: fs.createReadStream(imgPath) 
      }, () => {
        try { fs.unlinkSync(imgPath); } catch(e) {}
      });
    } catch (e) { return message.reply("API Error Call Boss SAHU"); }
  }
};
