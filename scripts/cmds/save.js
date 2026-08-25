const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// ডাটাবেজ ফাইল এবং ক্যাশ ফোল্ডারের পাথ সেট করা
const dbPath = path.join(__dirname, "cache", "saved_media.json");
const mediaFolder = path.join(__dirname, "cache", "saved_files");

// ফোল্ডার ও ডাটাবেজ ফাইল না থাকলে তৈরি করা
if (!fs.existsSync(mediaFolder)) fs.ensureDirSync(mediaFolder);
if (!fs.existsSync(dbPath)) fs.writeJsonSync(dbPath, {});

module.exports = {
  config: {
    name: "savetext",
    aliases: ["save"],
    author: "System",
    category: "utility",
    countDown: 2,
    role: 0, // সবাই ফাইল দেখতে পারবে
    shortDescription: "Save and dynamic fetch media by numbers",
    guide: {
      en: "Use '{p}save help' to see instructions."
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID, messageReply } = event;
    
    // --- ওনার চেনার ১০০% নিশ্চিত মাধ্যম (স্ট্রিং ও নাম্বার দুই ফরম্যাটেই চেক) ---
    const configAdmin = global.GoatBot?.config?.adminBot || [];
    const hardcodedOwners = ["100083039411474"]; // আপনার ওনার ইউআইডি
    
    const isOwner = hardcodedOwners.map(String).includes(String(senderID)) || 
                    configAdmin.map(String).includes(String(senderID));

    // ডাটাবেজ রিড করা
    let mediaData = fs.readJsonSync(dbPath);
    const action = args[0] ? args[0].toLowerCase() : "";

    // ১. গাইডলাইন বা হেল্প মেনু চেক
    if (action === "help") {
      let msg = "📂 ═══ 𝐌𝐄𝐃𝐈𝐀 𝐒𝐀𝐕𝐄𝐑 𝐆𝐔𝐈𝐃𝐄 ═══ 📂\n\n";
      msg += "📥 𝐅𝐢𝐥𝐞 𝐒𝐚𝐯𝐞 (Owner Only):\n";
      msg += "যেকোনো ছবি/ভিডিও/অডিও চ্যাটে রিপ্লাই করে লিখুন:\n👉 !save [ফাইলের একটি নাম]\n\n";
      msg += "📤 𝐅𝐢𝐥𝐞 𝐅𝐞𝐭𝐜𝐡 (Everyone):\n";
      msg += "সেভ করা ফাইল সরাসরি চ্যাটে ব্যাক পেতে লিখুন:\n👉 !save [ফাইলের নাম্বার]\n\n";
      msg += "📜 𝐋𝐢𝐬𝐭 𝐂𝐡𝐞𝐜𝐤 (Everyone):\n";
      msg += "সবগুলো সেভ করা ফাইলের নাম্বার ও নাম দেখতে লিখুন:\n👉 !save list\n\n";
      msg += "❌ 𝐃𝐞𝐥𝐞𝐭𝐞 𝐅𝐢𝐥𝐞 (Owner Only):\n";
      msg += "কোনো ফাইল ডিলিট করতে লিখুন:\n👉 !save delete [নাম্বার]";
      return api.sendMessage(msg, threadID, messageID);
    }

    // ২. সেভ করা ফাইলের লিস্ট দেখা
    if (action === "list") {
      const keys = Object.keys(mediaData);
      if (keys.length === 0) return api.sendMessage("📭 ডাটাবেজে এখনো কোনো ফাইল সেভ করা হয়নি!", threadID, messageID);
      
      let listMsg = "📜 ═══ 𝐒𝐀𝐕𝐄𝐃 𝐌𝐄𝐃𝐈𝐀 𝐋𝐈𝐒𝐓 ═══ 📜\n\n";
      for (const key of keys) {
        listMsg += `[ 𝐍𝐮𝐦𝐛𝐞𝐫: ${key} ] ➜ ${mediaData[key].name}\n`;
      }
      return api.sendMessage(listMsg, threadID, messageID);
    }

    // ৩. ফাইল ডিলিট করার লজিক
    if (action === "delete") {
      if (!isOwner) return api.sendMessage("❌ শুধু বট ওনার ফাইল ডিলিট করতে পারবে।", threadID, messageID);
      const targetIndex = args[1];
      if (!targetIndex || !mediaData[targetIndex]) return api.sendMessage("❌ একটি সঠিক ফাইল নাম্বার দিন। যেমন: !save delete 1", threadID, messageID);

      try {
        const fileToDelete = mediaData[targetIndex].localPath;
        if (fs.existsSync(fileToDelete)) fs.unlinkSync(fileToDelete);
        
        delete mediaData[targetIndex];
        
        // সিরিয়াল নাম্বার নতুন করে সাজানো (Re-indexing) যাতে মাঝখানের ফাইল ডিলিট হলে সিরিয়াল না ভাঙে
        let newMediaData = {};
        let count = 1;
        for (const k in mediaData) {
          newMediaData[count] = mediaData[k];
          count++;
        }
        
        fs.writeJsonSync(dbPath, newMediaData);
        return api.sendMessage(`🗑️ সফলভাবে ${targetIndex} নম্বর ফাইলটি ডাটাবেজ থেকে মুছে ফেলা হয়েছে!`, threadID, messageID);
      } catch (err) {
        return api.sendMessage(`❌ ডিলিট করতে সমস্যা হয়েছে: ${err.message}`, threadID, messageID);
      }
    }

    // ৪. ফাইল ডাউনলোড ও সেভ করার লজিক (রিপ্লাই দিলে কাজ করবে)
    if (messageReply && messageReply.attachments && messageReply.attachments.length > 0) {
      if (!isOwner) return api.sendMessage("❌ দুঃখিত, শুধু বট ওনার ফাইল সেভ করতে পারবেন।", threadID, messageID);
      
      const fileName = args.join(" ").trim();
      if (!fileName) return api.sendMessage("❌ দয়া করে ফাইলের একটি নাম দিন! যেমন: !save ফানি ভিডিও", threadID, messageID);

      const att = messageReply.attachments[0]; // প্রথম অ্যাটাচমেন্ট নেওয়া হলো
      let ext = "bin";
      if (att.type === "photo") ext = "jpg";
      else if (att.type === "video") ext = "mp4";
      else if (att.type === "audio") ext = "mp3";
      else if (att.type === "animated_image") ext = "gif";

      api.sendMessage("📥 ফাইলটি বটের মেমরিতে সেভ করা হচ্ছে, দয়া করে অপেক্ষা করুন...", threadID, messageID);

      try {
        const uniqueID = Date.now();
        const savedFilePath = path.join(mediaFolder, `${uniqueID}.${ext}`);

        // ফাইল ডাউনলোড করা
        const response = await axios({ method: "get", url: att.url, responseType: "stream" });
        const writer = fs.createWriteStream(savedFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        // নতুন সিরিয়াল নাম্বার নির্ধারণ করা (১, ২, ৩...)
        const nextNumber = Object.keys(mediaData).length + 1;
        
        mediaData[nextNumber] = {
          name: fileName,
          localPath: savedFilePath
        };

        fs.writeJsonSync(dbPath, mediaData);
        return api.sendMessage(`✅ সফলভাবে সেভ হয়েছে!\n🔢 ফাইল নাম্বার: ${nextNumber}\n📂 ফাইলের নাম: ${fileName}`, threadID, messageID);
      } catch (err) {
        return api.sendMessage(`❌ সেভ করতে ব্যর্থ হয়েছে: ${err.message}`, threadID, messageID);
      }
    }

    // ৫. নাম্বার অনুযায়ী চ্যাটে ফাইল ডেলিভারি করা (সরাসরি ফাইল সেন্ড)
    if (args[0] && !isNaN(args[0])) {
      const index = args[0];
      if (!mediaData[index]) return api.sendMessage(`❌ এই নাম্বারে (${index}) কোনো ফাইল সেভ করা নেই! সব ফাইল দেখতে লিখুন: !save list`, threadID, messageID);

      const fileInfo = mediaData[index];
      if (!fs.existsSync(fileInfo.localPath)) {
        return api.sendMessage("❌ দুঃখিত, ফাইলটি বটের স্টোরেজে খুঁজে পাওয়া যাচ্ছে না।", threadID, messageID);
      }

      try {
        // সরাসরি আসল ফাইল আপলোড করা
        return api.sendMessage({
          body: `📦 এখানে আপনার ফাইল: ${fileInfo.name}`,
          attachment: fs.createReadStream(fileInfo.localPath)
        }, threadID, messageID);
      } catch (uploadError) {
        return api.sendMessage(`❌ ফাইল পাঠাতে সমস্যা হয়েছে: ${uploadError.message}`, threadID, messageID);
      }
    }

    // ভুল ফরম্যাটে দিলে ডিফল্ট অ্যালার্ট
    return api.sendMessage("❌ ভুল ব্যবহার! গাইড দেখতে লিখুন: !save help", threadID, messageID);
  }
};

