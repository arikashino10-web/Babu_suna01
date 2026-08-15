const fs = require("fs-extra");
const path = require("path");

module.exports = {
 config: {
 name: "file",
 aliases: ["managefile"],
 version: "1.0.0",
 author: "SHAHADAT SAHU",
 countDown: 0,
 role: 3, // শুধুমাত্র বট অ্যাডমিনরা (Bot Admin) এটি ব্যবহার করতে পারবে
 shortDescription: { en: "List & delete command files" },
 longDescription: { en: "List all files in the command folder and delete them via reply." },
 category: "Admin",
 guide: { en: "{pn} | {pn} [name]" }
 },

 onStart: async function ({ message, args, event, role }) {
 // 🔒 সাধারণ ইউজার বা গ্রুপ অ্যাডমিনদের কমান্ড ব্যবহার করা থেকে সম্পূর্ণ ব্লক করার মেইন চেক
 if (role < 3) {
 return message.reply("❌ এই কমান্ডটি শুধুমাত্র বটের মূল অ্যাডমিনদের (Bot Admin) জন্য! আপনি এটি ব্যবহার করতে পারবেন না।");
 }

 let files = fs.readdirSync(__dirname);
 let msg = "";
 let i = 1;

 if (args && args.length > 0) {
 const word = args.join(" ");
 files = files.filter(f => f.includes(word));
 }

 if (!files.length) {
 return message.reply("❌ No files found.");
 }

 for (const file of files) {
 const stat = fs.statSync(path.join(__dirname, file));
 msg += `${i++}. ${stat.isDirectory() ? "[Folder🗂️]" : "[File📄]"} ${file}\n`;
 }

 return message.reply(
 `⚠️ Reply with number(s) to delete (space separated for multiple)\n\n${msg}`
 ).then(info => {
 global.GoatBot.onReply.set(info.messageID, {
 commandName: this.config.name,
 messageID: info.messageID,
 author: event.senderID,
 files: files
 });
 });
 },

 onReply: async function ({ message, event, Reply, role }) {
 // 🔒 সিকিউরিটি চেক: শুধু মূল ব্যবহারকারী এবং অ্যাডমিনই রিপ্লাই করতে পারবে
 if (role < 3 || event.senderID !== Reply.author) {
 return message.reply("❌ আপনার এই ফাইল এক্সেস করার পারমিশন নেই!");
 }

 const nums = event.body
 .split(" ")
 .map(n => parseInt(n))
 .filter(n => !isNaN(n));

 if (!nums.length) return;

 let msg = "";

 for (const num of nums) {
 const target = Reply.files[num - 1];
 if (!target) continue;

 const targetPath = path.join(__dirname, target);
 if (!fs.existsSync(targetPath)) continue;

 const stat = fs.statSync(targetPath);

 if (stat.isDirectory()) {
 fs.rmSync(targetPath, { recursive: true, force: true });
 msg += `[Folder🗂️] ${target}\n`;
 } else {
 fs.unlinkSync(targetPath);
 msg += `[File📄] ${target}\n`;
 }
 }

 global.GoatBot.onReply.delete(Reply.messageID);

 if (!msg) {
 return message.reply("❌ Nothing deleted.");
 }

 return message.reply(`✅ Deleted successfully:\n\n${msg}`);
 }
};
