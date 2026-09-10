module.exports = {
  config: {
    name: "tagreply",
    aliases: ["tr", "tagr", "nametag"],
    version: "2.0.0",
    author: "Banu_suna",
    countDown: 2,
    role: 0,
    description: {
      en: "Tag a member by name or by replying to their message",
      bn: "নাম দিয়ে বা কারো মেসেজে রিপ্লাই দিয়ে ট্যাগ করুন"
    },
    category: "box chat",
    guide: {
      en: "• Reply to someone's message:\n  {pn}\n  {pn} your text here\n\n• By name:\n  {pn} <name>\n  {pn} <name> <message>",
      bn: "• কারো মেসেজে রিপ্লাই দিয়ে:\n  {pn}\n  {pn} আপনার টেক্সট\n\n• নাম দিয়ে:\n  {pn} <নাম>\n  {pn} <নাম> <মেসেজ>"
    }
  },

  langs: {
    en: {
      missing: "⚠ Reply to someone's message or enter a name.\nExample:\n.tagreply (while replying)\n.tagreply Rocky Hello!",
      notFound: "✗ No member found matching \"%1\"",
      cannotTagSelf: "✗ You cannot tag yourself this way."
    },
    bn: {
      missing: "⚠ কারো মেসেজে রিপ্লাই দিন অথবা নাম লিখুন।\nউদাহরণ:\n.tagreply (রিপ্লাই দিয়ে)\n.tagreply Rocky কি করছো?",
      notFound: "✗ \"%1\" নামে কোনো মেম্বার পাওয়া যায়নি",
      cannotTagSelf: "✗ এইভাবে নিজেকে ট্যাগ করা যাবে না।"
    }
  },

  onStart: async function ({ api, event, args, message, usersData, threadsData, getLang }) {
    const { threadID, senderID, messageReply } = event;

    try {
      // ========== MODE 1: Reply to someone's message (Fast Path) ==========
      if (messageReply && messageReply.senderID) {
        const targetID = messageReply.senderID;
        const replyToMsgID = messageReply.messageID;
        const extraMessage = args.join(" ").trim();

        let targetName = "User";

        // দ্রুত নাম আনার চেষ্টা
        try {
          const dbName = await usersData.getName(targetID);
          if (dbName) targetName = dbName;
        } catch (e) {}

        if (targetName === "User") {
          try {
            const info = await api.getUserInfo(targetID);
            if (info[targetID]?.name) targetName = info[targetID].name;
          } catch (e) {}
        }

        const tagText = `@${targetName}`;
        let body = tagText;
        if (extraMessage) body += "\n" + extraMessage;

        return api.sendMessage(
          {
            body,
            mentions: [{ tag: tagText, id: targetID }]
          },
          threadID,
          null,
          replyToMsgID
        );
      }

      // ========== MODE 2: Tag by name ==========
      if (!args[0]) {
        return message.reply(getLang("missing"));
      }

      let searchQuery = args[0].toLowerCase().trim();
      let textAfterName = args.slice(1).join(" ").trim();

      // ---- Fast: threadsData থেকে নাম নেওয়ার চেষ্টা (ক্যাশ) ----
      let members = [];
      try {
        const threadData = await threadsData.get(threadID);
        if (threadData?.members && Array.isArray(threadData.members)) {
          members = threadData.members
            .filter(m => m.userID && m.userID != api.getCurrentUserID() && m.name)
            .map(m => ({
              id: m.userID,
              name: m.name,
              nameLower: m.name.toLowerCase(),
              firstName: m.name.split(" ")[0].toLowerCase()
            }));
        }
      } catch (e) {}

      // ---- threadsData খালি হলে getThreadInfo + batched getUserInfo ----
      if (members.length === 0) {
        const threadInfo = await api.getThreadInfo(threadID);
        const participantIDs = (threadInfo.participantIDs || []).filter(
          id => id != api.getCurrentUserID()
        );

        if (!participantIDs.length) {
          return message.reply(getLang("notFound", searchQuery));
        }

        // Facebook API তে একবারে অনেক ID দিলে ফেইল করে — ৪০ করে ব্যাচ
        const userInfos = {};
        const chunkSize = 40;
        for (let i = 0; i < participantIDs.length; i += chunkSize) {
          const chunk = participantIDs.slice(i, i + chunkSize);
          try {
            const info = await api.getUserInfo(chunk);
            Object.assign(userInfos, info);
          } catch (e) {
            // একটি চান্ক ফেইল হলেও বাকি চালু থাকবে
          }
        }

        // usersData.getName লুপে না চালিয়ে শুধু getUserInfo ব্যবহার
        for (const uid of participantIDs) {
          const name = userInfos[uid]?.name;
          if (!name) continue;
          members.push({
            id: uid,
            name,
            nameLower: name.toLowerCase(),
            firstName: name.split(" ")[0].toLowerCase()
          });
        }
      }

      if (members.length === 0) {
        return message.reply(getLang("notFound", searchQuery));
      }

      // ---- Matching (priority order) ----
      let matched = members.filter(m => m.firstName === searchQuery);

      if (matched.length === 0) {
        matched = members.filter(m => m.nameLower === searchQuery);
      }
      if (matched.length === 0) {
        matched = members.filter(m => m.firstName.startsWith(searchQuery));
      }
      if (matched.length === 0) {
        matched = members.filter(
          m => m.nameLower.startsWith(searchQuery) || m.nameLower.includes(searchQuery)
        );
      }

      // ২ শব্দের নাম চেষ্টা
      if (matched.length === 0 && args.length > 1) {
        const fullTry = args.slice(0, 2).join(" ").toLowerCase();
        matched = members.filter(
          m =>
            m.nameLower === fullTry ||
            m.nameLower.startsWith(fullTry) ||
            m.nameLower.includes(fullTry)
        );
        if (matched.length > 0) {
          textAfterName = args.slice(2).join(" ").trim();
        }
      }

      if (matched.length === 0) {
        return message.reply(getLang("notFound", searchQuery));
      }

      // অনেক ম্যাচ হলে শুধু প্রথম ১০ জন ট্যাগ (বড় গ্রুপে স্প্যাম আটকাতে)
      if (matched.length > 10) {
        matched = matched.slice(0, 10);
      }

      const mentions = [];
      let body = "";

      for (const m of matched) {
        const tagText = `@${m.name}`;
        mentions.push({ tag: tagText, id: m.id });
        body += tagText + " ";
      }

      body = body.trim();
      if (textAfterName) body += "\n" + textAfterName;

      return message.reply({
        body,
        mentions
      });

    } catch (err) {
      console.error("tagreply error:", err);
      return message.reply("✗ Error occurred. Please try again.");
    }
  }
};
