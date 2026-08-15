const axios = require("axios");
const { google } = require("googleapis");
const fs = require("fs-extra");
const path = require("path");

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
let drive = null;

if (fs.existsSync(CREDENTIALS_PATH)) {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ["https://googleapis.com"]
    });
    drive = google.drive({ version: "v3", auth });
}

const DB_PATH = path.join(__dirname, "cache", "gdrive_counter.json");
const LINKS_PATH = path.join(__dirname, "cache", "gdrive_links.json");
const USERS_PATH = path.join(__dirname, "cache", "gdrive_users.json");

fs.ensureDirSync(path.dirname(DB_PATH));
if (!fs.existsSync(DB_PATH)) fs.writeJsonSync(DB_PATH, { video: 0, audio: 0, image: 0, gif: 0, file: 0 });
if (!fs.existsSync(LINKS_PATH)) fs.writeJsonSync(LINKS_PATH, {});
if (!fs.existsSync(USERS_PATH)) fs.writeJsonSync(USERS_PATH, { allowedUsers: [] });

function getNextNumber(type) {
    const data = fs.readJsonSync(DB_PATH);
    data[type] = (data[type] || 0) + 1;
    fs.writeJsonSync(DB_PATH, data);
    return data[type];
}

function saveFileMapping(name, fileId, type, webLink) {
    const data = fs.readJsonSync(LINKS_PATH);
    data[name.toLowerCase()] = { id: fileId, type: type, link: webLink };
    fs.writeJsonSync(LINKS_PATH, data);
}

function getFileData(name) {
    const data = fs.readJsonSync(LINKS_PATH);
    return data[name.toLowerCase()] || null;
}

function extractAllUrls(text) {
    if (!text) return [];
    return text.match(/(https?:\/\/[^\s]+)/g) || [];
}

module.exports = {
    config: {
        name: "gdrive",
        aliases: ["gd", "drive"],
        version: "12.0",
        author: "Arafat & Sahu",
        countDown: 2,
        role: 0, 
        shortDescription: { en: "Advanced Gmail Google Drive Control Panel" },
        longDescription: { en: "Manage your Gmail Google drive easily with auto-numbering, permissions and list selection." },
        category: "UTILITY",
        guide: { en: "{pn} help" }
    },

    onStart: async function ({ api, event, args, message, role }) {
        if (!drive) return message.reply("❌ 'credentials.json' ফাইলটি মেইন ডিরেক্টরিতে সেটআপ করা নেই!");

        const { senderID, messageReply } = event;
        const usersData = fs.readJsonSync(USERS_PATH);

        const isMainAdmin = (role >= 3); 
        const isAllowedUser = usersData.allowedUsers.includes(senderID) || isMainAdmin;

        if (!isAllowedUser) {
            return message.reply("❌ আপনার এই ড্রাইভ কমান্ড প্যানেল ব্যবহার করার কোনো পারমিশন নেই!");
        }

        const subCommand = args[0] ? args[0].toLowerCase() : "";

        if (subCommand === "help") {
            let helpMsg = "━━━━━ 𝐆𝐃𝐑𝐈𝐕𝐄 𝐇𝐄𝐋𝐏 ━━━━━\n\n" +
                          "🔹 [শুধু লিংক] ➔ ড্রাইভ সেভ ছাড়া ডিরেক্ট প্লে\n" +
                          "🔹 .gdrive save ➔ অটো নাম্বারিংয়ে ফাইল সেভ\n" +
                          "🔹 .gdrive save [নাম] ➔ কাস্টম নামে ফাইল সেভ\n" +
                          "🔹 .gdrive [নাম/নাম্বার] ➔ ফাইল চ্যাটে প্রদর্শন/প্লে\n" +
                          "🔹 .gdrive file [নাম/নাম্বার] ➔ ড্রাইভ ফাইল লিংক\n" +
                          "🔹 .gdrive del [নাম/নাম্বার] ➔ ড্রাইভ থেকে স্থায়ী ডিলিট\n" +
                          "🔹 .gdrive [ক্যাটাগরি] list ➔ ফাইলের তালিকা\n" +
                          "🔹 .gdrive edit [পুরাতন_নাম] [নতুন_নাম] ➔ নাম পরিবর্তন\n\n" +
                          "👑 𝐀𝐃𝐌𝐈𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒:\n" +
                          "🔸 .gdrive user add [Reply/UID] ➔ ইউজার যুক্ত করা\n" +
                          "🔸 .gdrive user ➔ ইউজার রিমুভ ও লিস্ট\n" +
                          "━━━━━━━━━━━━━━━━━━";
            return message.reply(helpMsg);
        }

        if (subCommand === "user") {
            if (!isMainAdmin) return message.reply("❌ এই ক্ষমতা শুধুমাত্র মেইন অ্যাডমিনের আছে!");
            
            if (args[1] === "add") {
                let targetUID = args[2] || (messageReply ? messageReply.senderID : null);
                if (!targetUID) return message.reply("❌ অনুগ্রহ করে ইউজারের UID দিন অথবা তার মেসেজে রিপ্লাই দিন।");
                
                if (!usersData.allowedUsers.includes(targetUID)) {
                    usersData.allowedUsers.push(targetUID);
                    fs.writeJsonSync(USERS_PATH, usersData);
                }
                return message.reply(`✅ ইউজার (UID: ${targetUID}) সফলভাবে ড্রাইভ এক্সেস তালিকায় যুক্ত হয়েছে।`);
            }

            if (usersData.allowedUsers.length === 0) return message.reply("⭕ পারমিশন পাওয়া কোনো ইউজারের তালিকা নেই।");
            let uList = "👥 𝐆𝐃𝐑𝐈𝐕𝐄 𝐔𝐒𝐄𝐑 𝐋𝐈𝐒𝐓:\n\n";
            for (let i = 0; i < usersData.allowedUsers.length; i++) {
                uList += `${i + 1}. UID: ${usersData.allowedUsers[i]}\n`;
            }
            uList += "\n👉 যে ইউজারকে রিমুভ করতে চান, এই মেসেজে তার নম্বর টাইপ করে রিপ্লাই দিন।";
            
            return message.reply(uList).then(info => {
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: this.config.name,
                    type: "user_remove",
                    author: senderID,
                    list: usersData.allowedUsers,
                    messageID: info.messageID
                });
            });
        }

        if (subCommand === "edit") {
            const oldName = args[1];
            const newName = args[2];
            if (!oldName || !newName) return message.reply("❌ সঠিক নিয়ম: .gdrive edit [পুরাতন_নাম] [নতুন_নাম]");

            const fileData = getFileData(oldName);
            if (!fileData) return message.reply("❌ এই নামের কোনো ফাইল ডাটাবেসে পাওয়া যায়নি!");

            try {
                await drive.files.update({ fileId: fileData.id, requestBody: { name: newName } });
                
                const allLinks = fs.readJsonSync(LINKS_PATH);
                allLinks[newName.toLowerCase()] = { id: fileData.id, type: fileData.type, link: fileData.link };
                delete allLinks[oldName.toLowerCase()];
                fs.writeJsonSync(LINKS_PATH, allLinks);

                return message.reply(`✅ ফাইলের নাম '${oldName}' থেকে বদলে সফলভাবে '${newName}' করা হয়েছে!`);
            } catch (err) {
                return message.reply(`❌ নাম পরিবর্তন ব্যর্থ হয়েছে: ${err.message}`);
            }
        }

        if (subCommand === "del" || subCommand === "delete") {
            const targetName = args[1];
            if (!targetName) return message.reply("❌ অনুগ্রহ করে ফাইলের নাম বা নাম্বার দিন। যেমন: .gdrive del video_1");

            const fileData = getFileData(targetName);
            if (!fileData) return message.reply("❌ এই নামের কোনো ফাইল ড্রাইভ ডাটাবেসে নেই।");

            try {
                await drive.files.delete({ fileId: fileData.id });
                const allLinks = fs.readJsonSync(LINKS_PATH);
                delete allLinks[targetName.toLowerCase()];
                fs.writeJsonSync(LINKS_PATH, allLinks);
                return message.reply(`🗑️ '${targetName}' ফাইলটি ড্রাইভ থেকে সফলভাবে ডিলিট করা হয়েছে!`);
            } catch (err) {
                return message.reply(`❌ ডিলিট ব্যর্থ হয়েছে: ${err.message}`);
            }
        }

        if (subCommand === "file") {
            const targetName = args[1];
            if (!targetName) return message.reply("❌ ফাইলের নাম দিন। যেমন: .gdrive file video_1");

            const fileData = getFileData(targetName);
            if (!fileData) return message.reply("❌ ফাইলটি পাওয়া যায়নি।");
            return message.reply(`📁 𝐅𝐢𝐥𝐞: ${targetName}\n🔗 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐋𝐢𝐧𝐤:\n${fileData.link}`);
        }

        if (subCommand === "save") {
            if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
                return message.reply("❌ দয়া করে কোনো ছবি/ভিдеоতে রিপ্লাই দিয়ে .gdrive save লিখুন।");
            }

            const attach = messageReply.attachments[0];
            let fileType = "file";
            let ext = "bin";

            if (attach.type === "video") { fileType = "video"; ext = "mp4"; }
            else if (attach.type === "photo") { fileType = "image"; ext = "jpg"; }
            else if (attach.type === "audio") { fileType = "audio"; ext = "mp3"; }
            else if (attach.type === "animated_image") { fileType = "gif"; ext = "gif"; }

            let fileName = args.slice(1).join(" ").trim(); 
            if (!fileName) {
                const currentCount = getNextNumber(fileType);
                fileName = `${fileType}_${currentCount}`;
            }
            const fullFileName = `${fileName}.${ext}`;

            const wait = await message.reply(`⏳ '${fullFileName}' নামে জিমেইল ড্রাইভে সেভ হচ্ছে...`);

            try {
                const responseStream = await axios({ method: "get", url: attach.url, responseType: "stream" });
                const driveResponse = await drive.files.create({
                    requestBody: { name: fullFileName, mimeType: responseStream.headers["content-type"] },
                    media: { mimeType: responseStream.headers["content-type"], body: responseStream.data },
                    fields: "id, webViewLink"
                });

                await drive.permissions.create({ fileId: driveResponse.data.id, requestBody: { role: "reader", type: "anyone" } });
                saveFileMapping(fileName, driveResponse.data.id, fileType, driveResponse.data.webViewLink);

                await message.unsend(wait.messageID);
                return message.reply(`✅ 𝐒𝐚𝐯𝐞 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥!\n\n📁 Name: ${fileName}\n🆔 ID: ${driveResponse.data.id}\n🔗 Link: ${driveResponse.data.webViewLink}`);
            } catch (e) {
                return message.reply(`❌ সেভ করতে সমস্যা হয়েছে: ${e.message}`);
            }
        }

        if (args[1] === "list") {const catType = args[0].toLowerCase();const allLinks = fs.readJsonSync(LINKS_PATH);const filtered = Object.keys(allLinks).filter(k => allLinks[k].type === catType);if (filtered.length === 0) return message.reply(⭕ ${catType} ক্যাটাগরিতে কোনো ফাইল সেভ করা নেই।);let listMsg = 📂 𝐆𝐃𝐑𝐈𝐕𝐄 ${catType.toUpperCase()} 𝐋𝐈𝐒𝐓:\n\n;for (let i = 0; i < filtered.length; i++) {listMsg += ${i + 1}. ${filtered[i]}\n;}listMsg += "\n👉 যে ফাইলটি প্লে করতে চান, তার নম্বর টাইপ করে রিপ্লাই দিন।";return message.reply(listMsg).then(info => {global.GoatBot.onReply.set(info.messageID, {commandName: this.config.name,type: "list_choose",author: senderID,list: filtered,messageID: info.messageID});});}const urls = extractAllUrls(event.body);if (urls.length > 0) {try {const wait = await message.reply("⏳ লিংক থেকে ফাইলটি প্রসেস করা হচ্ছে (No Save)...");const resStream = await axios({ method: "get", url: urls[0], responseType: "stream" });await message.unsend(wait.messageID);return message.reply({ body: "✅ Temporary Playback:", attachment: resStream.data });} catch (err) {return message.reply(❌ লিংক প্লে করতে সমস্যা হয়েছে: ${err.message});}}const checkName = args.join(" ").trim();if (checkName) {const fileData = getFileData(checkName);if (fileData) {try {const wait = await message.reply(⏳ '${checkName}' ড্রাইভ থেকে লোড হচ্ছে...);const res = await drive.files.get({ fileId: fileData.id, alt: "media" }, { responseType: "stream" });await message.unsend(wait.messageID);return message.reply({ body: ✅ Playing: ${checkName}, attachment: res.data });} catch (e) {return message.reply(❌ ফাইলটি প্লে করতে সমস্যা হয়েছে: ${e.message});}} else {return message.reply("❌ এই নামে বা নাম্বারে কোনো ফাইল বা কমান্ড পাওয়া যায়নি। সাহায্য পেতে লিখুন: .gdrive help");}}},onReply: async function ({ event, message, Reply }) {const { author, type, list, messageID } = Reply;if (event.senderID !== author) return;const choice = parseInt(event.body.trim());if (isNaN(choice) || choice < 1 || choice > list.length) {global.GoatBot.onReply.delete(messageID);return message.reply("❌ বাতিল করা হয়েছে।");}global.GoatBot.onReply.delete(messageID);const selectedItem = list[choice - 1];if (type === "user_remove") {const usersData = fs.readJsonSync(USERS_PATH);usersData.allowedUsers = usersData.allowedUsers.filter(u => u !== selectedItem);fs.writeJsonSync(USERS_PATH, usersData);return message.reply(🗑️ ইউজার (UID: ${selectedItem}) সফলভাবে অনুমতি তালিকা থেকে রিমুভ হয়েছে।);}if (type === "list_choose") {const allLinks = fs.readJsonSync(LINKS_PATH);const fileData = allLinks[selectedItem.toLowerCase()];try {const wait = await message.reply(⏳ '${selectedItem}' ড্রাইভ থেকে লোড হচ্ছে...);const auth = new google.auth.GoogleAuth({ keyFile: CREDENTIALS_PATH, scopes: ["googleapis.com"] });const localDrive = google.drive({ version: "v3", auth });const res = await localDrive.files.get({ fileId: fileData.id, alt: "media" }, { responseType: "stream" });await message.unsend(wait.messageID);return message.reply({ body: ✅ Playing selected: ${selectedItem}, attachment: res.data });} catch (e) {return message.reply(❌ ফাইলটি আনতে সমস্যা হয়েছে: ${e.message});}}}};
