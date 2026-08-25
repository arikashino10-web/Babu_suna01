// Fix for: process.stderr.clearLine is not a function
if (typeof process.stderr.clearLine !== "function") {
  process.stderr.clearLine = () => {};
  process.stderr.cursorTo = () => {};
  process.stderr.moveCursor = () => {};
}
if (typeof process.stdout.clearLine !== "function") {
  process.stdout.clearLine = () => {};
  process.stdout.cursorTo = () => {};
  process.stdout.moveCursor = () => {};
}

const schedule = require("node-schedule");
const moment = require("moment-timezone");
const chalk = require("chalk");

module.exports = {
  config: {
    name: "autosent",
    version: "4.4.2",
    author: "Your Name",
    countDown: 5,
    role: 0,
    description: {
      en: "24-hour intelligent group companion with MP4 videos (BD Time)",
      vi: "Hệ thống tin nhắn thông minh 24 giờ kèm video"
    },
    category: "system",
    guide: {
      en: "Automatic system. No command required."
    }
  },

  // এই ফাংশনটা অবশ্যই থাকতে হবে (তোমার বট এটা চায়)
  onStart: async function () {
    return;
  },

  onLoad: async function ({ api }) {
    if (global.autosentStarted) return;
    global.autosentStarted = true;

    console.log(chalk.hex("#f472b6").bold("✦ AUTOSENT 4.4.2 — GoatBot V2 Style ✦"));

    global.autosentData = global.autosentData || {
      activity: {},
      dailyMessages: {},
      dailyMembers: {},
      recentMain: {}
    };

    const data = global.autosentData;

    // ========== VIDEO LINKS ==========
    const videos = {
      morning: "https://files.catbox.moe/3b5km4.mp4",
      afternoon: "https://files.catbox.moe/6in51c.mp4",
      evening: "https://files.catbox.moe/1wil0m.mp4",
      night: "https://files.catbox.moe/f3h67p.mp4"
    };

    // ========== MESSAGES ==========
    const messages = {
      "00:00": {
        texts: [
          "🌙 রাত ১২টা বাজে।\nআজকের দিনটা এখানেই শেষ।\nযা খারাপ হয়েছে সেটা আজকের সাথেই রেখে দাও।\nকাল আবার নতুন একটা দিন। ❤️",
          "🕛 MIDNIGHT CHECK\n\nসবাইকে একটা কথা—\nআজকের ভুলগুলো নিয়ে ঘুমাতে যেও না।\nকাল আবার নতুন করে শুরু করা যাবে। 🌙",
          "🌌 রাত অনেক হয়েছে।\n\nহয়তো কেউ ঘুমিয়ে গেছে,\nকেউ এখনো online,\nআর কেউ নিজের চিন্তার সাথে যুদ্ধ করছে।\n\nGood Night. ❤️"
        ],
        video: videos.night
      },
      "02:00": {
        texts: [
          "🌙 রাত ২টা!\n\nএখনো জেগে আছো?\nঘুম তোমাকে block করেছে নাকি তুমি ঘুমকে block করেছো? 😂",
          "👀 2:00 AM\n\nএই সময় যারা জেগে থাকে,\nতাদের দুইটা কারণ থাকে—\nঅতিরিক্ত চিন্তা অথবা অতিরিক্ত scrolling. 😂",
          "🌌 রাত ২টা বাজে।\n\nচোখ দুটোকে একটু rest দাও।\nFacebook পৃথিবী তোমাকে ছাড়া এক ঘণ্টা চলবে। 😂"
        ],
        video: videos.night
      },
      "04:00": {
        texts: [
          "🌅 ভোর ৪টা...\n\nআর কিছুক্ষণ পরেই সকাল।\nরাত যতই দীর্ঘ হোক,\nশেষে সকাল আসবেই। ❤️",
          "🌌 4:00 AM\n\nপৃথিবী এখন অনেক শান্ত।\nনিজের জন্য কয়েক মিনিট রাখো।",
          "🕌 ভোরের সময় কাছাকাছি।\n\nনিজেকে একটু শান্ত করো।\nনতুন দিনের জন্য প্রস্তুত হও।"
        ],
        video: videos.night
      },
      "06:00": {
        texts: [
          "☀️ GOOD MORNING!\n\nনতুন সকাল, নতুন সুযোগ।\nআজকের দিনটা গতকালের চেয়ে একটু ভালো করার চেষ্টা করো। ❤️",
          "🌞 সকাল ৬টা!\n\nউঠে পড়ো।\nএক গ্লাস পানি খাও।\nতারপর দিন শুরু করো।",
          "☀️ MORNING SYSTEM ACTIVATED!\n\nআজকের Mission:\nনিজেকে গতকালের চেয়ে ১% better করা। 🔥"
        ],
        video: videos.morning
      },
      "08:00": {
        texts: [
          "🍳 সকাল ৮টা!\n\nনাস্তা করেছো?\nনাকি আবার মোবাইলটাই breakfast হয়ে গেছে? 😂",
          "☀️ 8:00 AM\n\nযে কাজটা অনেকদিন ধরে পিছিয়ে দিচ্ছো,\nআজ সেটার শুরুটা করে ফেলো।",
          "🥐 BREAKFAST CHECK!\n\nআগে নাস্তা করো,\nতারপর দুনিয়া জয় করতে বের হও। 😂🔥"
        ],
        video: videos.morning
      },
      "10:00": {
        texts: [
          "🧠 সকাল ১০টা।\n\nঘড়ি কিন্তু থেমে নেই।\nসময়কে কাজে লাগাও।",
          "⚡ 10:00 AM\n\nআজকের সবচেয়ে গুরুত্বপূর্ণ কাজটা এখনই শুরু করো।",
          "👀 ছোট্ট reminder:\n\nতোমার future version তোমার আজকের decision-এর উপর নির্ভর করছে।"
        ],
        video: videos.morning
      },
      "12:00": {
        texts: [
          "🌤️ দুপুর ১২টা!\n\nঅর্ধেক দিন প্রায় শেষ।\nআজ এখন পর্যন্ত কী করেছো?\nনিজেকে ১০-এর মধ্যে কত দেবে? 👀",
          "🥤 MIDDAY CHECK\n\nপানি খাও।\nচোখকে একটু বিশ্রাম দাও।",
          "☀️ GOOD AFTERNOON!\n\nসকালের plan নষ্ট হলেও সমস্যা নেই।\nদিন এখনো শেষ হয়নি। Restart করা যায়। 🔥"
        ],
        video: videos.afternoon
      },
      "14:00": {
        texts: [
          "🍛 দুপুর ২টা।\n\nখাওয়া হয়েছে?\nনাকি group-এর message পড়তে পড়তে lunch ভুলে গেছো? 😂",
          "😌 2:00 PM\n\nএকটু slow হও।\nসবকিছু একসাথে ঠিক করতে হবে না।",
          "🕌 Afternoon Reminder\n\nনিজের প্রয়োজনীয় কাজগুলো শেষ করো।\nদিন এখনো অনেকটা বাকি।"
        ],
        video: videos.afternoon
      },
      "16:00": {
        texts: [
          "🌇 বিকেল ৪টা।\n\nআজকের দিনটা এখনো তোমার হাতে আছে।\nআরও ভালো কিছু করা যায়। 🔥",
          "🚶 বিকেলের reminder:\n\nসম্ভব হলে একটু হাঁটাহাঁটি করো।\nশুধু screen-এর দিকে তাকিয়ে থেকো না। 😂",
          "⏳ 4:00 PM\n\nআজকের কতটা সময় useful ছিল?\nনিজের কাছে সত্যি উত্তরটা দিও।"
        ],
        video: videos.afternoon
      },
      "18:00": {
        texts: [
          "🌆 GOOD EVENING!\n\nদিনটা ধীরে ধীরে শেষ হচ্ছে।\nএকটু শান্ত হও। ❤️",
          "🌇 সন্ধ্যা ৬টা।\n\nমোবাইলের বাইরেও একটা পৃথিবী আছে।\nপরিবারের সাথে একটু সময় কাটাও।",
          "🕌 সন্ধ্যার সময়।\n\nসারাদিনের ব্যস্ততার মাঝে কয়েক মিনিট নিজের জন্য রাখো।"
        ],
        video: videos.evening
      },
      "20:00": {
        texts: [
          "🍽️ রাত ৮টা!\n\nDinner Check!\nখাবার খেয়েছো তো?\nনাকি এখনো group-এ পড়ে আছো? 😂",
          "🌃 8:00 PM\n\nএকটু family time,\nএকটু হাসি,\nআর একটু নিজের জন্য সময়। ❤️",
          "😌 রাত ৮টা।\n\nআজকের কাজ সব শেষ না হলেও সমস্যা নেই।\nযতটুকু পেরেছো, সেটুকুর জন্য নিজেকে credit দাও।"
        ],
        video: videos.evening
      },
      "22:00": {
        texts: [
          "🌙 রাত ১০টা।\n\nআজকে অনেক screen time হয়েছে।\nআর কতক্ষণ scroll করবে? 😂",
          "🛌 10:00 PM\n\nকালকের জন্য mind-টাকে একটু rest দাও।\nসব problem আজ রাতেই solve করতে হবে না।",
          "🌙 GOOD NIGHT MODE: 70%\n\nদিনটা কেমন গেল?\nভালো হলে মনে রেখো।\nখারাপ হলে ছেড়ে দাও।\nকাল আবার চেষ্টা করা যাবে। ❤️"
        ],
        video: videos.night
      }
    };

    const silenceMessages = [
      "🦗🦗🦗\nএখানে এত নীরবতা কেন?\nঝিঁঝিঁ পোকার শব্দও শুনতে পাচ্ছি। 😂",
      "👀 এই গ্রুপে কি সবাই invisible হয়ে গেলো?",
      "📡 GROUP SIGNAL CHECK...\n\nকেউ কি আছো?\nনাকি সবাই অন্য গ্রুপে পালিয়ে গেছো? 😂",
      "🤖 আমি এক ঘণ্টা ধরে অপেক্ষা করছি...\n\nকেউ একটা 'হাই' বললেও চলবে। 🥲",
      "😶 এত চুপচাপ কেন?\n\nএই group কি এখন library হয়ে গেছে?",
      "🚨 SILENCE DETECTED!\n\nগত এক ঘণ্টায় কোনো activity পাওয়া যায়নি।",
      "👻 GHOST MODE ACTIVATED\n\nসবাই কি একসাথে ghost হয়ে গেছো? 👻",
      "🕵️ সন্দেহ হচ্ছে...\n\nএই group-এর সবাই একসাথে ঘুমিয়ে পড়েছে।",
      "📢 PUBLIC ANNOUNCEMENT\n\nএই group-এ কথা বলার অনুমতি এখনো চালু আছে। 😂",
      "😴 GROUP STATUS\n\nActivity: 0%\nNoise: 0%\nDrama: Unknown 👀"
    ];

    function getRandom(list, threadID) {
      if (!data.recentMain[threadID]) data.recentMain[threadID] = [];
      let available = list.filter(msg => !data.recentMain[threadID].includes(msg));
      if (available.length === 0) {
        data.recentMain[threadID] = [];
        available = list;
      }
      const selected = available[Math.floor(Math.random() * available.length)];
      data.recentMain[threadID].push(selected);
      if (data.recentMain[threadID].length > 6) data.recentMain[threadID].shift();
      return selected;
    }

    async function sendWithVideo(text, videoUrl, threadID) {
      try {
        let attachment = null;
        if (videoUrl && global.utils && global.utils.getStreamFromURL) {
          attachment = await global.utils.getStreamFromURL(videoUrl);
        }
        if (attachment) {
          await api.sendMessage({ body: text, attachment }, threadID);
        } else {
          await api.sendMessage(text, threadID);
        }
      } catch (e) {
        try {
          await api.sendMessage(text, threadID);
        } catch (err) {}
      }
    }

    // Daily Report 00:05
    const reportRule = new schedule.RecurrenceRule();
    reportRule.tz = "Asia/Dhaka";
    reportRule.hour = 0;
    reportRule.minute = 5;

    schedule.scheduleJob(reportRule, async () => {
      if (!global.data?.allThreadID) return;
      const threads = global.data.allThreadID;

      for (const threadID of threads) {
        const total = data.dailyMessages[threadID] || 0;
        const members = data.dailyMembers[threadID] ? Object.keys(data.dailyMembers[threadID]).length : 0;

        let activity = "😴 Very Quiet";
        if (total >= 500) activity = "🔥 EXTREMELY ACTIVE";
        else if (total >= 250) activity = "⚡ VERY ACTIVE";
        else if (total >= 100) activity = "😎 ACTIVE";
        else if (total >= 30) activity = "🙂 NORMAL";

        const yesterday = moment().tz("Asia/Dhaka").subtract(1, "day").format("DD MMM YYYY");

        const report = `📊 DAILY GROUP REPORT
━━━━━━━━━━━━━━━━━━
📅 Date: ${yesterday}

💬 Total Messages: ${total}
👥 Active Members: ${members}

📈 Activity Level:
${activity}

━━━━━━━━━━━━━━━━━━
🌙 নতুন দিন শুরু হয়েছে।
Let's make today better. 🔥`;

        try {
          await api.sendMessage(report, threadID);
          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {}

        data.dailyMessages[threadID] = 0;
        data.dailyMembers[threadID] = {};
      }
      console.log(chalk.hex("#fbbf24").bold("📊 Daily Reports Sent (00:05 BD)"));
    });

    // Main every 2 hours
    Object.keys(messages).forEach(time => {
      const [hour, minute] = time.split(":").map(Number);

      const rule = new schedule.RecurrenceRule();
      rule.tz = "Asia/Dhaka";
      rule.hour = hour;
      rule.minute = minute || 0;

      schedule.scheduleJob(rule, async () => {
        if (!global.data?.allThreadID) return;
        const threads = global.data.allThreadID;
        const msgData = messages[time];

        for (const threadID of threads) {
          const text = getRandom(msgData.texts, threadID);
          await sendWithVideo(text, msgData.video, threadID);
          await new Promise(r => setTimeout(r, 2000));
        }
        console.log(chalk.hex("#34d399")(`✓ Main + MP4 → ${time} (BD Time)`));
      });

      console.log(chalk.hex("#67e8f9")(`✓ Scheduled → ${time} (BD)`));
    });

    // Silence every 90 minutes
    schedule.scheduleJob("*/90 * * * *", async () => {
      if (!global.data?.allThreadID) return;
      const threads = global.data.allThreadID;
      const now = Date.now();
      const ONE_HOUR_30 = 90 * 60 * 1000;

      for (const threadID of threads) {
        const lastActivity = data.activity[threadID] || 0;
        if (!lastActivity) continue;

        if (now - lastActivity >= ONE_HOUR_30) {
          const text = getRandom(silenceMessages, threadID);
          try {
            await api.sendMessage(`😂 SILENCE DETECTOR\n\n${text}`, threadID);
            await new Promise(r => setTimeout(r, 1500));
            console.log(chalk.hex("#facc15")(`🔇 Silent Group → ${threadID}`));
          } catch (e) {}
        }
      }
    });

    console.log(chalk.hex("#fbbf24").bold("✓ Silence Detector → Every 1 hour 30 minutes"));
    console.log(chalk.hex("#a78bfa").bold("✓ Daily Report → 00:05 AM (BD)"));
    console.log(chalk.hex("#34d399").bold("✓ Main Messages + MP4 → Every 2 hours (BD Time)"));
  },

  onChat: async function ({ event, api }) {
    if (!event || !event.threadID) return;

    try {
      const botID = api.getCurrentUserID();
      if (event.senderID == botID) return;
    } catch (e) {}

    const threadID = event.threadID;
    const senderID = event.senderID;

    global.autosentData = global.autosentData || {
      activity: {},
      dailyMessages: {},
      dailyMembers: {},
      recentMain: {}
    };

    const data = global.autosentData;
    data.activity[threadID] = Date.now();

    if (!data.dailyMessages[threadID]) data.dailyMessages[threadID] = 0;
    data.dailyMessages[threadID]++;

    if (!data.dailyMembers[threadID]) data.dailyMembers[threadID] = {};
    if (senderID) data.dailyMembers[threadID][senderID] = true;
  }
};
