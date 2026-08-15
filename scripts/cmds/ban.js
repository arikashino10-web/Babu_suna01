module.exports = {
  config: {
    name: "ban",
    version: "2.4.0",
    role: 2, // hasPermssion: 2 এর পরিবর্তে role: 2 ব্যবহার করা হয়েছে
    author: "SHAHADAT SAHU",
    longDescription: "Ban or unban a user directly, works on reply too",
    category: "group",
    guide: {
      en: "{pn} <UID/@tag> or unban <UID/@tag>"
    }
  },

  onStart: async function ({ event, api, args, Users }) {
    const { threadID, messageID, messageReply } = event;

    if (!args[0] && !messageReply) 
      return api.sendMessage("Usage: ban <UID/@tag> or unban <UID/@tag>, or reply to a user's message", threadID, messageID);

    // PREFIX এরর দূর করতে সরাসরি event.body থেকে প্রথম শব্দ নেওয়া হয়েছে
    const fullCommand = event.body.split(" ")[0].toLowerCase();
    let command = "ban";
    if (fullCommand.includes("unban")) command = "unban";

    let targetID;
    if (messageReply) {
      targetID = messageReply.senderID;
    }
    else if (Object.keys(event.mentions).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    } 
    else {
      targetID = args[0];
    }

    if (!targetID) return api.sendMessage("Please mention, reply, or give UID!", threadID, messageID);
    if (isNaN(targetID)) return api.sendMessage("Invalid UID!", threadID, messageID);
    if (global.data && global.data.allUserID && !global.data.allUserID.includes(targetID)) 
      return api.sendMessage("[ User System ] ID you import doesn't exist in database", threadID, messageID);

    let nameTarget = `${targetID}`;
    try {
      nameTarget = global.data?.userName?.get(targetID) || await Users.getNameUser(targetID);
    } catch (e) {}

    if (command === "ban") {
      try {
        let data = (await Users.getData(targetID)).data || {};
        data.banned = true;
        await Users.setData(targetID, { data });
        if (global.data && global.data.userBanned) {
          global.data.userBanned.set(targetID, { reason: null, dateAdded: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }) });
        }
        return api.sendMessage(`[ Ban User ] Banned user: ${targetID} - ${nameTarget}`, threadID, messageID);
      } catch (err) {
        return api.sendMessage("[ Ban User ] Can't do what you request", threadID);
      }
    }

    else if (command === "unban") {
      try {
        let data = (await Users.getData(targetID)).data || {};
        if (!data.banned) return api.sendMessage(`[ Unban User ] User ${targetID} - ${nameTarget} is not banned.`, threadID);

        data.banned = false;
        await Users.setData(targetID, { data });
        if (global.data && global.data.userBanned) {
          global.data.userBanned.delete(targetID);
        }

        return api.sendMessage(`[ Unban User ] Unbanned user: ${targetID} - ${nameTarget}`, threadID, messageID);
      } catch (err) {
        return api.sendMessage("[ Unban User ] Can't do what you request", threadID);
      }
    }

    else {
      return api.sendMessage("Wrong input! Use ban/unban <UID/@tag> or reply to a user's message", threadID, messageID);
    }
  }
};
