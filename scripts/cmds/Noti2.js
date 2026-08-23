const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "noti2",
    version: "2.5.0",
    author: "System",
    role: 2,
    shortDescription: "Send attachment directly to all groups",
    longDescription: "Broadcast audio/video/file directly without links",
    category: "admin",
    guide: "{p}noti2 [reply to attachment with text]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, messageReply, senderID } = event;
    
    // ১. বট অ্যাডমিন পারমিশন চেক
    const adminIDs = global.GoatBot.config.adminBot || [];
    if (!adminIDs.includes(senderID)) {
      return api.sendMessage("❌ শুধু বট অ্যাডমিন ব্যবহার করতে পারবে", threadID, messageID);
    }

    // ২. অ্যাটাচমেন্ট রিপ্লাই চেক
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("❌ কোনো অডিও/ভিডিও/ছবি/গিফ রিপ্লাই করে !noti2 লিখুন", threadID, messageID);
    }

    let text = args.join(" ").trim();
    if (!text) text = messageReply.body || "📢 বট নোটিফিকেশন";

    // ৩. বটের সব গ্রুপ আইডি বের করা (১০০০ গ্রুপ পর্যন্ত লিমিট বাড়ানো হয়েছে)
    let allThreads = [];
    try {
      const threadList = await api.getThreadList(1000, null, ["INBOX"]);
      allThreads = threadList
        .filter(t => t.isGroup === true && t.threadID !== threadID)
        .map(t => t.threadID);
    } catch (e) {
      const dbThreads = global.db?.allThreadData || [];
      allThreads = dbThreads
        .filter(t => t.threadID && t.threadID !== threadID)
        .map(t => t.threadID);
    }

    if (allThreads.length === 0) {
      return api.sendMessage("❌ কোনো গ্রুপ পাওয়া যায়নি", threadID, messageID);
    }

    api.sendMessage(`📤 বটের সব (${allThreads.lengthটি}) গ্রুপে সরাসরি ফাইল পাঠানো শুরু হলো...`, threadID, messageID);

    // ৪. ফাইলটি বটের লোকাল ক্যাশে আসল ফাইল হিসেবে ডাউনলোড করা
    const attachmentPaths = [];
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);

    try {
      for (let i = 0; i < messageReply.attachments.length; i++) {
        const att = messageReply.attachments[i];
        let ext = "bin";
        
        // ফাইল ফরম্যাট চেক
        if (att.type === "photo") ext = "jpg";
        else if (att.type === "video") ext = "mp4";
        else if (att.type === "audio") ext = "mp3";
        else if (att.type === "animated_image") ext = "gif";

        const filePath = path.join(cacheDir, `direct_${Date.now()}_${i}.${ext}`);
        
        // ফেসবুকের লিংক থেকে সরাসরি ফাইল নামানো
        const response = await axios({
          method: "get",
          url: att.url,
          responseType: "stream",
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        attachmentPaths.push(filePath);
      }
    } catch (downloadError) {
      console.error(downloadError);
      return api.sendMessage("❌ ফাইল প্রসেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", threadID, messageID);
    }

    // ৫. লুপের মাধ্যমে প্রতিটি গ্রুপে সরাসরি ফাইল আপলোড
    let success = 0, fail = 0;
    for (const tid of allThreads) {
      try {
        const directAttachments = attachmentPaths.map(p => fs.createReadStream(p));
        
        await api.sendMessage({
          body: text,
          attachment: directAttachments
        }, tid);
        
        success++;
      } catch (err) {
        fail++;
        console.log(`[noti2] Failed to upload to ${tid}:`, err.message);
      }
      // ফেসবুক আইডি সেফ রাখার জন্য ২.৫ সেকেন্ড বিরতি
      await new Promise(r => setTimeout(r, 2500));
    }

    // ৬. ব্যবহৃত ফাইল ডিলিট করে ক্যাশ খালি করা
    for (const p of attachmentPaths) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    return api.sendMessage(`✅ সরাসরি পাঠানো শেষ!\nسফল: ${success}টি গ্রুপে\nব্যর্থ: ${fail}টি গ্রুপে`, threadID, messageID);
  }
};
