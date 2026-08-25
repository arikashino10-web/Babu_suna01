const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "shazam",
    aliases: ["sz"],
    version: "2.0",
    author: "Tenzo (fixed)",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Identify songs from audio/video" },
    longDescription: { en: "Identify songs using Audd.io recognition API" },
    category: "media",
    guide: { en: "{pn} — reply to an audio or video attachment" }
  },

  onStart: async function ({ message, event, api }) {
    if (event.type !== "message_reply") {
      return message.reply("🎵 একটি অডিও বা ভিডিও মেসেজ reply করে .shazam লিখুন।");
    }

    const attachment = event.messageReply.attachments[0];
    if (!attachment) {
      return message.reply("❌ Reply করা মেসেজে কোনো attachment নেই।");
    }

    const validTypes = ["audio", "video"];
    if (!validTypes.includes(attachment.type)) {
      return message.reply("❌ শুধুমাত্র audio বা video ফাইল সাপোর্ট করা হয়।");
    }

    await this.identifySong({ message, event, api, url: attachment.url });
  },

  identifySong: async function ({ message, event, api, url }) {
    api.setMessageReaction("🎧", event.messageID);

    let tempAudioPath = null;
    let tempImagePath = null;

    try {
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      // অডিও ফাইল ডাউনলোড করো
      tempAudioPath = path.join(cacheDir, `shazam_audio_${Date.now()}.mp3`);
      const audioRes = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      await fs.writeFile(tempAudioPath, Buffer.from(audioRes.data));

      // Audd.io API-তে পাঠাও (song recognition)
      const FormData = require("form-data");
      const form = new FormData();
      form.append("file", fs.createReadStream(tempAudioPath));
      form.append("return", "apple_music,spotify");

      // এখানে আপনার নিজের Audd.io API Key বসাতে পারেন (ফ্রি লিমিট শেষ হলে)
      // form.append("api_token", "YOUR_AUDDIO_API_KEY"); 

      const shazamRes = await axios.post("https://api.audd.io/", form, {
        headers: form.getHeaders(),
        timeout: 30000
      });

      const data = shazamRes.data;

      if (data.status !== "success" || !data.result) {
        api.setMessageReaction("❌", event.messageID);
        return message.reply("🔍 গানটি চেনা যায়নি। অন্য একটি অডিও দিয়ে চেষ্টা করুন।");
      }

      const result = data.result;
      const title = result.title || "Unknown";
      const artist = result.artist || "Unknown";
      const album = result.album || "N/A";
      const releaseDate = result.release_date || "N/A";
      const songLink = result.song_link || "";

      let replyText =
        `🎵 গান খুঁজে পাওয়া গেছে!\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `🎼 Title: ${title}\n` +
        `🎤 Artist: ${artist}\n` +
        `💿 Album: ${album}\n` +
        `📅 Release: ${releaseDate}\n`;

      if (songLink) replyText += `🔗 Link: ${songLink}\n`;

      // থাম্বনেইল ডাউনলোডের চেষ্টা
      const thumbnail =
        result.apple_music?.artwork?.url?.replace("{w}", "500").replace("{h}", "500") ||
        result.spotify?.album?.images?.[0]?.url ||
        null;

      const attachments = [];

      if (thumbnail) {
        try {
          tempImagePath = path.join(cacheDir, `shazam_thumb_${Date.now()}.jpg`);
          const imgRes = await axios({
            method: "get",
            url: thumbnail,
            responseType: "stream",
            timeout: 15000
          });
          const writer = fs.createWriteStream(tempImagePath);
          imgRes.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });
          attachments.push(fs.createReadStream(tempImagePath));
        } catch (_) {}
      }

      if (attachments.length > 0) {
        await message.reply({ body: replyText, attachment: attachments });
      } else {
        await message.reply(replyText);
      }

      api.setMessageReaction("✅", event.messageID);

    } catch (error) {
      console.error("Shazam Error:", error);
      api.setMessageReaction("❌", event.messageID);
      return message.reply("❌ গানটি সনাক্ত করার সময় একটি ত্রুটি ঘটেছে।");
    } finally {
      // ক্যাশ ক্লিয়ারেন্স (অস্থায়ী ফাইল মুছে ফেলা)
      try {
        if (tempAudioPath && (await fs.exists(tempAudioPath))) {
          await fs.unlink(tempAudioPath);
        }
        if (tempImagePath && (await fs.exists(tempImagePath))) {
          await fs.unlink(tempImagePath);
        }
      } catch (cleanupError) {
        console.error("Cleanup Error:", cleanupError);
      }
    }
  }
};

