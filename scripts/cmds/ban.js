module.exports = {
  config: {
    name: "ban",
    version: "2.4.0",
    role: 2, 
    author: "SHAHADAT SAHU",
    shortDescription: { en: "Ban a user" },
    longDescription: { en: "Ban or unban a user directly, works on reply too" },
    category: "group",
    guide: { en: "{pn} <UID/@tag> or unban <UID/@tag>" }
  },

  onStart: async function ({ message, event, args, Users }) {
    const { threadID, messageReply } = event;
    const input = args.join(" ").trim();
    if (!input && !messageReply) return message.reply("Usage: ban <UID/@tag> or unban <UID/@tag>, or reply to a message");

    const fullCommand = event.body.split(" ").map(v => v.toLowerCase());
    let command = "ban";
    if (fullCommand.includes("unban")) command = "unban";

    let targetID = messageReply ? messageReply.senderID : (Object.keys(event.mentions).length > 0 ? Object.keys(event.mentions)[0] : args[0]);
    if (!targetID) return message.reply("Please mention, reply, or give UID!");

    let nameTarget = `${targetID}`;
    try { nameTarget = await Users.getNameUser(targetID); } catch (e) {}

    if (command === "ban") {
      try {
        let data = (await Users.getData(targetID)).data || {};
        data.banned = true;
        await Users.setData(targetID, { data });
        return message.reply(`[ Ban User ] Banned user: ${targetID} - ${nameTarget}`);
      } catch (err) { return message.reply("[ Ban User ] Error occurred"); }
    } else {
      try {
        let data = (await Users.getData(targetID)).data || {};
        data.banned = false;
        await Users.setData(targetID, { data });
        return message.reply(`[ Unban User ] Unbanned user: ${targetID} - ${nameTarget}`);
      } catch (err) { return message.reply("[ Unban User ] Error occurred"); }
    }
  }
};
