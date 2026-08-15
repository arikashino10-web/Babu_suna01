const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "random",
    version: "11.9.7",
    role: 0,
    author: "Shaon Ahmed",
    shortDescription: { en: "random love story video" },
    longDescription: { en: "Download and play a random love story video from the API" },
    category: "video",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event }) {
    try {
      // মেইন এপিআই লিস্ট থেকে ইউআরএল নেওয়া
      const apiResponse = await axios.get("https://raw.githubusercontent.com/shaonproject/Shaon/main/api.json");
      const apiUrl = apiResponse.data.api;
      
      const randomUrl = `${apiUrl}/video/random`;
      
      // ভিডিওর ডিটেইলস এবং ডাউনলোড লিঙ্ক নেওয়া
      const response = await axios.get(randomUrl);
      const videoCount = response.data.count;
      const videoName = response.data.name;
      const videoDownloadUrl = response.data.url;

      // ক্যাশ ডিরেক্টরি নিখুঁতভাবে চেক করা
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) {
        fs.ensureDirSync(cacheDir);
      }
      
      const imgPath = path.join(cacheDir, `Shaoon_${Date.now()}.mp4`);

      // Axios দিয়ে ভিডিও ফাইলটি ডাউনলোড করা (এটি বেশি ফাস্ট এবং নিরাপদ)
      const videoStream = await axios.get(videoDownloadUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(imgPath, videoStream.data);

      // আপনার বটের আসল নিয়ম অনুযায়ী ভিডিও মেসেজ পাঠানো
      return message.reply({
        body: `𝐒𝐏𝐀𝐘𝐒𝐇𝐄𝐀𝐋 𝐑𝐀𝐍𝐃𝐎𝐌 𝐌𝐈𝐗 \nAdded by: [${videoName}]\n𝚃𝙾𝚃𝙰𝙻 𝚅𝙸𝙳𝙴𝙾:${videoCount}...🎬\n\n｢─꯭─⃝‌‌𝐒𝐡𝐚𝐡𝐚𝐝𝐚𝐭 𝐂𝐡𝐚𝐭 𝐁𝐨𝐭｣`,
        attachment: fs.createReadStream(imgPath)
      }, () => {
        try { fs.unlinkSync(imgPath); } catch(e) {}
      });

    } catch (e) {
      return message.reply("❌ ভিডিও ডাউনলোড করতে সমস্যা হচ্ছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন বা বস সাহু-কে জানান।");
    }
  }
};
