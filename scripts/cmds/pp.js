module.exports = {
  config: {
    name: "profile",
    aliases: ["pp", "dp"],
    version: "0.0.8",
    role: 0,
    author: "Arafat",
    description: "Get users profile photo",
    category: "information",
    countDown: 10,
  },

  onStart: async function ({ event, message, usersData, api, args, threadsData }) {
    try {
      const uid1 = event.senderID;
      const uid2 = Object.keys(event.mentions)[0];
      let uid;

      if (args[0]) {
        if (/^\d+$/.test(args[0])) {
          uid = args[0];
        } else {
          const match = args[0].match(/profile\.php\?id=(\d+)/);
          if (match) uid = match[1];
        }
      }

      if (!uid) {
        uid = event.type === "message_reply"
          ? event.messageReply.senderID
          : uid2 || uid1;
      }

      let userInfo;
      try {
        userInfo = await api.getUserInfo(uid);
      } catch (e) {
        return message.reply("❌ | Failed to fetch user profile picture.");
      }

      const uInfo = userInfo[uid] || {};

      // FIX 1: Try usersData first, then fall back to userInfo's own avatar fields
      let avatarUrl = null;
      try {
        avatarUrl = await usersData.getAvatarUrl(uid);
      } catch (e) {
        // FIX 2: Fall back to the profileUrl / thumbSrc from userInfo
        avatarUrl = uInfo.profileUrl || uInfo.thumbSrc || null;
      }

      function toSerifBold(text) {
        const map = {
          A:"𝐀",B:"𝐁",C:"𝐂",D:"𝐃",E:"𝐄",F:"𝐅",G:"𝐆",H:"𝐇",I:"𝐈",J:"𝐉",
          K:"𝐊",L:"𝐋",M:"𝐌",N:"𝐍",O:"𝐎",P:"𝐏",Q:"𝐐",R:"𝐑",S:"𝐒",T:"𝐓",
          U:"𝐔",V:"𝐕",W:"𝐖",X:"𝐗",Y:"𝐘",Z:"𝐙",
          a:"𝐚",b:"𝐛",c:"𝐜",d:"𝐝",e:"𝐞",f:"𝐟",g:"𝐠",h:"𝐡",i:"𝐢",j:"𝐣",
          k:"𝐤",l:"𝐥",m:"𝐦",n:"𝐧",o:"𝐨",p:"𝐩",q:"𝐪",r:"𝐫",s:"𝐬",t:"𝐭",
          u:"𝐮",v:"𝐯",w:"𝐰",x:"𝐱",y:"𝐲",z:"𝐳",
          0:"𝟎",1:"𝟏",2:"𝟐",3:"𝟑",4:"𝟒",5:"𝟓",6:"𝟔",7:"𝟕",8:"𝟖",9:"𝟗"
        };
        return String(text).split("").map(c => map[c] || c).join("");
      }

      let isAdmin = "N/A";
      if (event.threadID) {
        try {
          const threadInfo = await threadsData.get(event.threadID);
          if (threadInfo?.adminIDs) {
            isAdmin = threadInfo.adminIDs.includes(uid) ? "✅ 𝐘𝐞𝐬" : "❎ 𝐍𝐨";
          }
        } catch (e) {}
      }

      const userName = toSerifBold(uInfo.name || "Unknown");

      const userInformation = `>🎀 ${userName}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
𝐁𝐚𝐛𝐲, 𝐇𝐞𝐫𝐞'𝐬 𝐲𝐨𝐮𝐫 𝐩𝐫𝐨𝐟𝐢𝐥𝐞 😘`;

      // FIX 3: Try to stream the avatar, log errors, and inform user if unavailable
      let attachments = [];
      if (avatarUrl) {
        try {
          const stream = await global.utils.getStreamFromURL(avatarUrl);
          if (stream) {
            attachments.push(stream);
          } else {
            console.warn(`[profile] getStreamFromURL returned falsy for uid ${uid}`);
          }
        } catch (e) {
          console.error(`[profile] Failed to stream avatar for uid ${uid}:`, e);
        }
      }

      // FIX 4: Notify user if avatar could not be loaded instead of silently omitting it
      const body = attachments.length === 0
        ? `${userInformation}\n\n⚠️ | Could not load profile picture.`
        : userInformation;

      await message.reply({
        body,
        attachment: attachments.length > 0 ? attachments : undefined
      });

    } catch (error) {
      console.error("Profile command error:", error);
      return message.reply("❌ | An error occurred.");
    }
  },
};
