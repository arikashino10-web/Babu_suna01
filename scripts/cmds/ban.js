module.exports = {
  config: {
    name: "ban",
    version: "2.4.0",
    role: 2, 
    author: "SHAHADAT SAHU",
    longDescription: "Ban or unban a user directly, works on reply too",
    category: "group",
    guide: { en: "{pn} <UID/@tag> or unban <UID/@tag>" }
  },

  onStart: async function ({ event, api, args, Users }) {
    const { threadID, messageID, messageReply } = event;
    if (!args && !messageReply) return api.sendMessage("Usage: ban <UID/@tag> or unban <UID/@tag>", threadID, messageID);

    const fullCommand = event.body.split(" ").map(v => v.toLowerCase());
    let command = "ban";
    if (fullCommand.includes("unban")) command = "unban";

    let targetID = messageReply ? messageReply.senderID : (Object.keys(event.mentions).length > 0 ? Object.keys(event.mentions)[0] : args[0]);
    if (!targetID) return api.sendMessage("Please mention, reply, or give UID!", threadID, messageID);

    let nameTarget = `${targetID}`;
    try { nameTarget = await Users.getNameUser(targetID); } catch (e) {}

    if (command === "ban") {
      try {
        let data = (await Users.getData(targetID)).data || {};
        data.banned = true;
        await Users.setData(targetID, { data });
        return api.sendMessage(`[ Ban User ] Banned user: ${targetID} - ${nameTarget}`, threadID, messageID);
      } catch (err) { return api.sendMessage("[ Ban User ] Error occurred", threadID); }
    } else {
      try {
        let data = (await Users.getData(targetID)).data || {};
        data.banned = false;
        await Users.setData(targetID, { data });
        return api.sendMessage(`[ Unban User ] Unbanned user: ${targetID} - ${nameTarget}`, threadID, messageID);
      } catch (err) { return api.sendMessage("[ Unban User ] Error occurred", threadID); }
    }
  }
};
