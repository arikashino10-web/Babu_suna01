const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

let atmDir = [];

async function getAtm(attachments, bodyText) {
  let msgObject = { body: bodyText, attachment: [] };
  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);

  for (let file of attachments) {
    try {
      const res = await axios.get(file.url, { responseType: 'arraybuffer' });
      const ext = file.url.split('.').pop().split('?')[0] || 'png';
      const fileName = `noti_${Date.now()}.${ext}`;
      const filePath = path.join(cacheDir, fileName);
      
      fs.writeFileSync(filePath, res.data);
      msgObject.attachment.push(fs.createReadStream(filePath));
      atmDir.push(filePath);
    } catch (err) {
      console.log(err);
    }
  }
  return msgObject;
}

module.exports = {
  config: {
    name: "noti2",
    version: "1.0.0",
    role: 2, // এডমিনদের জন্য পারমিশন লক করা
    author: "MAHBUB SHAON",
    shortDescription: { en: "Send notification to all groups" },
    longDescription: { en: "Send an admin notification to all chat groups with reply support" },
    category: "sandnoto",
    guide: { en: "[msg]" }
  },

  onStart: async function ({ message, event, args, Users, api }) {
    const { threadID, messageID, senderID, messageReply } = event;
    if (!args[0]) return message.reply("Please input message");

    let allThreads = global.data?.allThreadID || [];
    let successCount = 0;
    let failCount = 0;
    
    const adminName = await Users.getNameUser(senderID);
    let baseText = `𝐀𝐃𝐌𝐈𝐍 𝐍𝐎𝐓𝐈𝐅𝐈𝐂𝐀𝐓𝐈𝐎𝐍\n•┄┅═════❁🌺❁═════┅┄•\n\n𝐌𝐀𝐒𝐒𝐀𝐆𝐄: ${args.join(" ")}\n\n𝗔𝗗𝗠𝗜𝗡 🇳🇦🇲🇪: ${adminName} `;
    
    let sendData = baseText;
    if (event.type == "message_reply" && messageReply.attachments && messageReply.attachments.length > 0) {
      sendData = await getAtm(messageReply.attachments, `𝐌𝐀𝐒𝐒𝐀𝐆𝐄 𝐅𝐑𝐎𝐌 𝐀𝐃𝐌𝐈𝐍\n•┄┅═════❁🌺❁═════┅┄•\n𝐌𝐀𝐒𝐒𝐀𝐆𝐄: ${args.join(" ")}\n\n𝗔𝗗𝗠𝗜𝗡 🇳🇦🇲🇪: ${adminName}`);
    }

    for (let id of allThreads) {
      try {
        await new Promise((resolve) => {
          api.sendMessage(sendData, id, (err, info) => {
            if (err) {
              failCount++;
            } else {
              successCount++;
              if (global.client && global.client.handleReply) {
                global.client.handleReply.push({
                  name: "noti2",
                  type: "sendnoti",
                  messageID: info.messageID,
                  messID: messageID,
                  threadID: threadID
                });
              }
            }
            resolve();
          });
        });
      } catch (e) {
        failCount++;
      }
    }

    // ফাইল পাঠানোর পর ক্যাশ ডিলিট করা
    atmDir.forEach(p => { try { fs.unlinkSync(p); } catch(e){} });
    atmDir = [];

    return message.reply(`Send to ${successCount} thread, not send to ${failCount} thread`);
  },

  handleReply: async function ({ message, event, handleReply, Users, api }) {
    const { threadID, messageID, senderID, body, attachments } = event;
    let userName = await Users.getNameUser(senderID);

    if (handleReply.type === "sendnoti") {
      let replyText = `== User Reply ==\n\n『Reply』 : ${body}\n\n\nUser Name ${userName} \nFrom Group ${threadID}`;
      let sendData = replyText;

      if (attachments && attachments.length > 0) {
        sendData = await getAtm(attachments, `== User Reply ==\n\n『Reply』 : ${body}\n\n\nUser Name: ${userName} \nFrom Group ${threadID}`);
      }

      api.sendMessage(sendData, handleReply.threadID, (err, info) => {
        atmDir.forEach(p => { try { fs.unlinkSync(p); } catch(e){} });
        atmDir = [];
        if (global.client && global.client.handleReply) {
          global.client.handleReply.push({
            name: "noti2",
            type: "reply",
            messageID: info.messageID,
            messID: messageID,
            threadID: threadID
          });
        }
      });
    } 
    
    else if (handleReply.type === "reply") {
      let adminNotice = `𝐀𝐃𝐌𝐈𝐍 𝐍𝐎𝐓𝐈𝐅𝐈𝐂𝐀𝐓𝐈𝐎𝐍\n•┄┅═════❁🌺❁═════┅┄•\n\n｢𝐌𝐄𝐒𝐒𝐀𝐆𝐄｣ : ${body}\n\n\n｢𝗔𝗗𝗠𝗜𝗡 ｣ ${userName}\n\n•┄┅═════❁🌺❁═════┅┄• আপনি যদি এডমিন এর সঙ্গে কথা বলতে চান। তাইলে অবশ্যই মেসেজের রিপ্লাই দিয়া মেসেজ করো। আমি তা এডিমন এর কাছে পৌঁছে দিবো`;
      let sendData = adminNotice;

      if (attachments && attachments.length > 0) {
        sendData = await getAtm(attachments, `${body} \n𝐀𝐃𝐌𝐈𝐍 𝐍𝐎𝐓𝐈𝐅𝐈𝐂𝐀𝐓𝐈𝐎𝐍 \n•┄┅═════❁🌺❁═════┅┄•\n\n 𝐀𝐃𝐌𝐈𝐍 ${userName}\n\n•┄┅═════❁🌺❁═════┅┄• আপনি যদি এডমিন এর সঙ্গে কথা বলতে চান। তাইলে অবশ্যই মেসেজের রিপ্লাই দিয়া মেসেজ করো। আমি তা এডিমন এর কাছে পৌঁছে দিবো.`);
      }

      api.sendMessage(sendData, handleReply.threadID, (err, info) => {
        atmDir.forEach(p => { try { fs.unlinkSync(p); } catch(e){} });
        atmDir = [];
        if (global.client && global.client.handleReply) {
          global.client.handleReply.push({
            name: "noti2",
            type: "sendnoti",
            messageID: info.messageID,
            threadID: threadID
          });
        }
      }, handleReply.messID);
    }
  }
};
       
