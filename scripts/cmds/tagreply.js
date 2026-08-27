module.exports = {
  config: {
    name: "tagreply",
    aliases: ["tr", "tagr", "nametag"],
    version: "1.1.0",
    author: "Banu_suna",
    countDown: 3,
    role: 0,
    description: {
      en: "Tag a member by name or by replying to their message (bot replies to their message)",
      bn: "নাম দিয়ে বা কারো মেসেজে রিপ্লাই দিয়ে ট্যাগ করুন (বট সরাসরি সেই মেসেজে রিপ্লাই দেয়)"
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

  onStart: async function ({ api, event, args, message, usersData, getLang }) {
    const { threadID, senderID, messageReply } = event;
    const extraMessage = args.join(" ").trim();

    try {
      // ========== MODE 1: Reply to someone's message ==========
      if (messageReply && messageReply.senderID) {
        const targetID = messageReply.senderID;
        const replyToMsgID = messageReply.messageID;

        // Optional: prevent tagging self
        // if (targetID === senderID) {
        //   return message.reply(getLang("cannotTagSelf"));
        // }

        let targetName = "User";
        try {
          const info = await api.getUserInfo(targetID);
          if (info[targetID]?.name) targetName = info[targetID].name;
        } catch (e) {}

        try {
          const dbName = await usersData.getName(targetID);
          if (dbName) targetName = dbName;
        } catch (e) {}

        const tagText = `@${targetName}`;
        let body = tagText;
        if (extraMessage) {
          body += "\n" + extraMessage;
        }

        // Important: reply directly to the other person's message (NOT user's command)
        return api.sendMessage(
          {
            body: body,
            mentions: [
              {
                tag: tagText,
                id: targetID
              }
            ]
          },
          threadID,
          null,
          replyToMsgID   // <-- this makes the bot reply to THAT message
        );
      }

      // ========== MODE 2: Tag by name (old behavior) ==========
      if (!args[0]) {
        return message.reply(getLang("missing"));
      }

      let searchQuery = args[0].toLowerCase().trim();
      let textAfterName = args.slice(1).join(" ").trim();

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

      let matched = [];

      // Priority matching
      matched = members.filter(m => m.firstName === searchQuery);
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

      // Try 2-word full name
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

      const mentions = [];
      let body = "";

      for (const m of matched) {
        const tagText = `@${m.name}`;
        mentions.push({
          tag: tagText,
          id: m.id
        });
        body += tagText + " ";
      }

      body = body.trim();
      if (textAfterName) {
        body += "\n" + textAfterName;
      }

      return message.reply({
        body: body,
        mentions: mentions
      });

    } catch (err) {
      console.error("tagreply error:", err);
      return message.reply("✗ Error occurred. Please try again.");
    }
  }
};
