const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const LOVE_CAPTIONS = [
  "💛🌸\nতুমি আর আমি...\nএকটা অসম্পূর্ণ গল্পের দুইটা পাতা 🫶",
  "🌻💛\nনাম শুনলেই মনটা হালকা হয়ে যায়,\nএই অনুভূতিটার নামই হয়তো Love 🌼",
  "🫶💛\nতোমাকে পাওয়ার দাবি নেই,\nশুধু মনে মনে একটু ভালোবাসি 💛",
  "🌼🙂\nএকটা হাসি, একটা নাম,\nআর অজান্তেই ভালো লেগে যাওয়া...",
  "💛🌸\nতুমি জানো না,\nকিন্তু তোমার কথা মনে পড়লেই\nদিনটা সুন্দর হয়ে যায় 🫶",
  "🌻💛\nএই ভালো লাগাটুকু\nএখনই খুব দামী...\nLove 💛"
];

module.exports = {
  config: {
    name: "mylove",
    version: "1.0.1",
    author: "Banu_suna",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Tag someone + Love banner",
      bn: "নাম দিয়ে ট্যাগ + লাভ ব্যানার"
    },
    longDescription: {
      en: "Find a member by name, tag them and generate a romantic love banner",
      bn: "নাম দিয়ে মেম্বার খুঁজে ট্যাগ করে লাভ ব্যানার বানায়"
    },
    category: "banner",
    guide: {
      en: "{pn} <name>\nExample: {pn} fahima chan",
      bn: "{pn} <নাম>\nউদাহরণ: {pn} fahima chan"
    }
  },

  langs: {
    en: {
      missing: "⚠ Please enter a name.\nExample: .mylove fahima chan",
      notFound: "✗ No member found matching \"%1\"",
      cannotTagSelf: "✗ You cannot use this command on yourself.",
      multiple: "⚠ Multiple members found:\n%1\nPlease be more specific."
    },
    bn: {
      missing: "⚠ নাম লিখুন।\nউদাহরণ: .mylove fahima chan",
      notFound: "✗ \"%1\" নামে কোনো মেম্বার পাওয়া যায়নি",
      cannotTagSelf: "✗ নিজের উপর এই কমান্ড ব্যবহার করা যাবে না।",
      multiple: "⚠ একাধিক মেম্বার পাওয়া গেছে:\n%1\nআরেকটু স্পেসিফিক নাম দিন।"
    }
  },

  onStart: async function ({ api, event, args, message, usersData, getLang }) {
    const { threadID, senderID } = event;

    if (!args[0]) {
      return message.reply(getLang("missing"));
    }

    const searchQuery = args.join(" ").toLowerCase().trim();

    try {
      // ===== Find member by name =====
      const threadInfo = await api.getThreadInfo(threadID);
      const participantIDs = (threadInfo.participantIDs || []).filter(
        id => id != api.getCurrentUserID()
      );

      if (!participantIDs.length) {
        return message.reply(getLang("notFound", searchQuery));
      }

      let userInfos = {};
      try {
        userInfos = await api.getUserInfo(participantIDs);
      } catch (e) {}

      const members = [];
      for (const uid of participantIDs) {
        let name = userInfos[uid]?.name || null;
        try {
          const dbName = await usersData.getName(uid);
          if (dbName) name = dbName;
        } catch (e) {}

        if (!name) continue;

        members.push({
          id: uid,
          name: name,
          nameLower: name.toLowerCase(),
          firstName: name.split(" ")[0].toLowerCase()
        });
      }

      // Matching priority
      let matched = members.filter(m => m.nameLower === searchQuery);
      if (matched.length === 0) {
        matched = members.filter(m => m.firstName === searchQuery);
      }
      if (matched.length === 0) {
        matched = members.filter(m => m.nameLower.startsWith(searchQuery));
      }
      if (matched.length === 0) {
        matched = members.filter(m => m.nameLower.includes(searchQuery));
      }

      if (matched.length === 0) {
        return message.reply(getLang("notFound", searchQuery));
      }

      if (matched.length > 1) {
        const list = matched.map((m, i) => (i + 1) + ". " + m.name).join("\n");
        return message.reply(getLang("multiple", list));
      }

      const target = matched[0];
      const targetID = target.id;

      if (String(targetID) === String(senderID)) {
        return message.reply(getLang("cannotTagSelf"));
      }

      // ===== Generate Love Banner =====
      const apiList = await axios.get(
        "https://gitlab.com/shahadat-sahu/sahu-api/-/raw/main/API.json",
        { timeout: 15000 }
      );

      const AVATAR_CANVAS_API = apiList.data && apiList.data.AvatarCanvas;
      if (!AVATAR_CANVAS_API) {
        return message.reply("❌ AvatarCanvas API পাওয়া যায়নি।");
      }

      const res = await axios.post(
        AVATAR_CANVAS_API + "/api",
        {
          cmd: "crush2",
          senderID: senderID,
          targetID: targetID
        },
        { responseType: "arraybuffer", timeout: 30000 }
      );

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const imgPath = path.join(cacheDir, "mylove_" + senderID + "_" + targetID + ".png");
      await fs.writeFile(imgPath, Buffer.from(res.data));

      const caption = LOVE_CAPTIONS[Math.floor(Math.random() * LOVE_CAPTIONS.length)];
      const tagText = "@" + target.name;

      // এখানে স্ট্রিং যোগ করে বানানো হয়েছে যাতে template issue না হয়
      const finalBody = tagText + "\n\n" + caption;

      await message.reply({
        body: finalBody,
        mentions: [
          {
            tag: tagText,
            id: targetID
          }
        ],
        attachment: fs.createReadStream(imgPath)
      });

      try {
        await fs.unlink(imgPath);
      } catch (e) {}

    } catch (err) {
      console.error("mylove command error:", err && err.message ? err.message : err);
      return message.reply("✗ Error occurred. Please try again.");
    }
  }
};
