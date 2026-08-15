const axios = require("axios");

const baseApiUrl = async () => {
    try {
        const base = await axios.get(`https://githubusercontent.com`);
        return base.data.mahmud;
    } catch(e) {
        return "https://mahmud.xyz"; // ব্যাকআপ ডিফল্ট এপিআই
    }
};

module.exports = {
    config: {
        name: "ytb",
        aliases: ["youtube", "yt", "song", "video"],
        version: "6.0",
        author: "MahMUD",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Search and download YouTube Videos or Audio easily."
        },
        longDescription: {
            en: "Search and download YouTube Videos or Audio easily."
        },
        category: "media",
        guide: {
            en: "Use: {pn} [song name or youtube link]"
        }
    },

    langs: {
        en: {
            error: "❌ API error: %1",
            noResult: "⭕ No search results match the keyword!",
            choose: "%1\n━━━━━━━━━━━━━━━━\n📥 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 𝐎𝐏𝐓𝐈𝐎𝐍𝐒:\n\n🎧 অডিও (Audio) ডাউনলোড করতে রিপ্লাই দিন: [নম্বর] -a\n🎥 ভিডিও (Video) ডাউনলোড করতে রিপ্লাই দিন: [নম্বর] -v\n\n👉 উদাহরণ: ১ নম্বর গানটি অডিও নিতে চাইলে লিখুন: 1 -a\n👉 উদাহরণ: ১ নম্বর গানটি ভিডিও নিতে চাইলে লিখুন: 1 -v\n\n❌ বাতিল করতে যেকোনো কিছু লিখে রিপ্লাই দিন।",
            downloading: "⬇️ Fetching your requested %1...\n⏳ Please wait, uploading to Messenger...",
            failDownload: "❌ Sorry, failed to fetch download link from API."
        }
    },

    onStart: async function ({ api, args, message, event, commandName, getLang }) {
        if (!args || args.length === 0) return message.reply("❌ অনুগ্রহ করে গানের নাম বা লিংক দিন! উদাহরণ: /ytb perfect");

        const input = args.join(" ").trim();
        const apiUrl = await baseApiUrl();
        const checkUrl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;

        // লিংক সরাসরি ইনপুট দিলে ডিফল্ট ভিডিও ডাউনলোড শুরু হবে (লিংক দিলে সরাসরি ডাউনলোড)
        if (checkUrl.test(input)) {
            const videoID = input.match(checkUrl)[1];
            api.setMessageReaction("📥", event.messageID, () => {}, true);
            return this.handleDownload(message, videoID, "video", apiUrl, getLang);
        }

        // কি-ওয়ার্ড দিয়ে সার্চ এবং ছবিসহ তালিকা তৈরি
        try {
            api.setMessageReaction("🔍", event.messageID, () => {}, true);
            const res = await axios.get(`${apiUrl}/api/ytb/search?q=${encodeURIComponent(input)}`);
            const results = res.data.results?.slice(0, 5) || res.data.data?.slice(0, 5) || [];
            
            if (results.length === 0) return message.reply(getLang("noResult"));

            let msg = "━━━━━━━━━━━━━━\n   𝐘𝐎𝐔𝐓𝐔𝐁𝐄 𝐒𝐄𝐀𝐑𝐂𝐇\n━━━━━━━━━━━━━━\n";
            const attachments = [];

            for (let i = 0; i < results.length; i++) {
                msg += `${i + 1}. ${results[i].title}\n⏱️ Duration: ${results[i].time || results[i].duration || "N/A"}\n\n`;
                
                const thumbUrl = results[i].thumbnail || results[i].image || `https://ytimg.com{results[i].id || results[i].videoId}/hqdefault.jpg`;
                try {
                    const imgStream = await global.utils.getStreamFromURL(thumbUrl);
                    attachments.push(imgStream);
                } catch(err) {}
            }

            return message.reply({
                body: getLang("choose", msg),
                attachment: attachments
            }).then(info => {
                global.GoatBot.onReply.set(info.messageID, {
                    commandName,
                    author: event.senderID,
                    results,
                    apiUrl,
                    messageID: info.messageID
                });
            });
        } catch (e) {
            return message.reply(getLang("error", e.message));
        }
    },

    onReply: async function ({ event, message, Reply, getLang }) {
        const { results, apiUrl, author, messageID } = Reply;
        if (event.senderID !== author) return;

        const replyBody = event.body.trim().toLowerCase();
        const parts = replyBody.split(" ");
        
        const choice = parseInt(parts[0]);
        let type = "video"; // ডিফল্ট ভিডিও মোড

        // ইউজার অডিও চেয়েছে নাকি ভিডিও তা ডিটেক্ট করা হচ্ছে
        if (parts[1] === "-a" || parts[1] === "audio" || parts[1] === "music" || parts[1] === "গান") {
            type = "audio";
        } else if (parts[1] === "-v" || parts[1] === "video" || parts[1] === "ভিডিও") {
            type = "video";
        } else {
            // যদি ইউজার শুধু নম্বর দেয় (যেমন: 1), তবে স্বয়ংক্রিয়ভাবে ভিডিও ডাউনলোড হবে
            type = "video";
        }

        if (isNaN(choice) || choice < 1 || choice > results.length) {
            global.GoatBot.onReply.delete(messageID);
            return message.reply("❌ ডাউনলোড বাতিল করা হয়েছে।");
        }

        const selectedVideo = results[choice - 1];
        const videoID = selectedVideo.id || selectedVideo.videoId || (selectedVideo.id && selectedVideo.id.videoId);

        global.GoatBot.onReply.delete(messageID);

        // চূড়ান্তভাবে অডিও বা ভিডিও ডাউনলোড ফাংশনে পাঠানো হচ্ছে
        return this.handleDownload(message, videoID, type, apiUrl, getLang);
    },

    handleDownload: async function (message, videoID, type, apiUrl, getLang) {
        try {
            message.reply(getLang("downloading", type === "audio" ? "Audio 🎧" : "Video 🎥"));
            const endpoint = type === "audio" ? "audio" : "video";
            
            const downloadRes = await axios.get(`${apiUrl}/api/ytb/${endpoint}?id=${videoID}`);
            const resData = downloadRes.data;
            
            const downloadUrl = resData.downloadUrl || resData.link || resData.url || (resData.data && resData.data.downloadUrl) || (resData.data && resData.data.link);

            if (!downloadUrl) return message.reply(getLang("failDownload"));

            const stream = await global.utils.getStreamFromURL(downloadUrl);

            return message.reply({
                body: `✅ আপনার কাঙ্ক্ষিত ${type === "audio" ? "অডিও গানটি" : "ভিডিওটি"} সফলভাবে আপলোড করা হয়েছে!`,
                attachment: stream
            });

        } catch (err) {
            return message.reply(`❌ ডাউনলোড প্রসেস ব্যর্থ হয়েছে: ${err.message}\n👉 সম্ভাব্য কারণ: ফাইল সাইজ ২৫ মেগাবাইটের বেশি (মেসেঞ্জার লিমিট) অথবা এপিআই সার্ভার রেসপন্স করছে না।`);
        }
    }
};
