const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "4k",
    aliases: ["hd", "upscale", "enhance"],
    version: "2.5.0",
    author: "Arafat",
    countDown: 8,
    role: 0,
    shortDescription: { en: "High Quality Image Enhancer" },
    longDescription: { en: "Convert your low-quality images into high-quality HD/4K images using AI." },
    category: "image",
    guide: { en: "Reply to an image with {pn}" }
  },

  onStart: async function ({ message, event, api }) {
    const { messageReply, messageID, threadID } = event;
    
    // 📸 ইউজার ছবিতে রিপ্লাই করেছে কি না চেক
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
        return message.reply("❌ Please reply to an image to enhance it!");
    }

    const attachment = messageReply.attachments[0];
    if (attachment.type !== "photo") {
        return message.reply("❌ This is not a valid image. Please reply to a photo!");
    }

    const imageUrl = attachment.url;
    
    // ⚡ রি-অ্যাকশন এবং লোডিং মেসেজ (Goat-Bot মেথড ফিক্স)
    message.react("⚡");
    const loadingMsg = await api.sendMessage("⏳ AI is enhancing your image... Please wait a moment.", threadID, messageID);

    try {
      // 🌐 শক্তিশালী ও দ্রুতগতির আপডেটেড এপিআই
      const apiRes = await axios.get(`https://samirxp.com{encodeURIComponent(imageUrl)}`);
      const resultUrl = apiRes.data.url || apiRes.data.imageUrl || apiRes.data.result;

      if (!resultUrl) {
          throw new Error("API failed to generate high-quality image URL.");
      }

      // 📥 লাইভ ইউআরএল থেকে ইমেজ স্ট্রিম সরাসরি মেসেঞ্জারে পাঠানো হচ্ছে
      const stream = await global.utils.getStreamFromURL(resultUrl);

      // লোডিং মেসেজটি ডিলিট করে দেওয়া হচ্ছে
      try {
          await api.unsendMessage(loadingMsg.messageID);
      } catch(e) {}

      message.react("✅");
      return message.reply({
          body: "✨ Here is your enhanced 4K Image!",
          attachment: stream
        });

    } catch (err) {
      // যেকোনো এরর হলে লোডিং মেসেজ রিমুভ ও নোটিফিকেশন সেন্ড
      try {
          await api.unsendMessage(loadingMsg.messageID);
      } catch(e) {}
      
      message.react("❌");
      return message.reply(`❌ Failed to enhance the image.\n👉 Error: ${err.message}`);
    }
  }
};
