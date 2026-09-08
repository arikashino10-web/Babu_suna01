/**
 * GroupAI - Data Collector Only
 * শুধু গ্রুপের তথ্য জমা করে, কোনো অটো রিপ্লাই দেয় না
 */

const fs = require("fs-extra");
const path = require("path");

const memory = new Map();
const MEMORY_FILE = path.join(__dirname, "cache", "ai_agent.json");
const MAX_MSGS = 300;
const MAX_EVENTS = 150;

function saveMemory() {
  try {
    const obj = {};
    for (const [tid, data] of memory.entries()) {
      obj[tid] = {
        members: data.members,
        messages: data.messages.slice(-60),
        events: data.events.slice(-40),
        language: data.language || "bangla",
        threadName: data.threadName || null,
        created: data.created || Date.now(),
        messageCount: data.messageCount || 0,
        activeMembers: data.activeMembers || {},
        topics: data.topics || {}
      };
    }
    fs.ensureDirSync(path.dirname(MEMORY_FILE));
    fs.writeJsonSync(MEMORY_FILE, obj, { spaces: 2 });
  } catch (e) {}
}

function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return;
    const obj = fs.readJsonSync(MEMORY_FILE);
    for (const [tid, data] of Object.entries(obj)) {
      memory.set(tid, {
        members: data.members || {},
        messages: data.messages || [],
        events: data.events || [],
        language: data.language || "bangla",
        threadName: data.threadName || null,
        created: data.created || Date.now(),
        messageCount: data.messageCount || 0,
        activeMembers: data.activeMembers || {},
        topics: data.topics || {}
      });
    }
  } catch (e) {}
}

loadMemory();

function getThread(threadID) {
  if (!memory.has(threadID)) {
    memory.set(threadID, {
      members: {},
      messages: [],
      events: [],
      language: "bangla",
      threadName: null,
      created: Date.now(),
      messageCount: 0,
      activeMembers: {},
      topics: {}
    });
  }
  return memory.get(threadID);
}

function addMessage(threadID, name, body, id) {
  const th = getThread(threadID);
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  th.messageCount = (th.messageCount || 0) + 1;
  th.activeMembers[name] = (th.activeMembers[name] || 0) + 1;

  th.messages.push({
    name,
    body: body.slice(0, 500),
    time,
    id,
    timestamp: Date.now()
  });

  if (th.messages.length > MAX_MSGS) th.messages.shift();

  // Topic extraction
  const words = body.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (word.length > 3) {
      th.topics[word] = (th.topics[word] || 0) + 1;
    }
  }

  // Simple event detection
  const lower = body.toLowerCase();
  const eventKeywords = {
    negative: ["খারাপ", "গালি", "মারামারি", "ঝগড়া", "বিরক্ত", "hate", "fight", "angry"],
    positive: ["ভালোবাসি", "ভালো", "মজা", "হাসি", "love", "happy", "thanks", "good"],
    question: ["কি", "কে", "কেন", "কখন", "কেমন", "what", "who", "why", "when", "how"]
  };

  for (const [type, keywords] of Object.entries(eventKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      th.events.push({
        who: name,
        what: body.slice(0, 300),
        time,
        type,
        timestamp: Date.now()
      });
      if (th.events.length > MAX_EVENTS) th.events.shift();
      break;
    }
  }

  saveMemory();
}

module.exports = {
  config: {
    name: "groupai",
    version: "2.0.0",
    author: "Modified",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Only collects group data, no auto reply"
    },
    longDescription: {
      en: "Silently stores all group messages, members and events. Does not reply automatically."
    },
    category: "utility",
    guide: {
      en: "{pn} status / stats / clear"
    }
  },

  onStart: async function ({ message, event, args }) {
    const th = getThread(event.threadID);
    const cmd = (args[0] || "").toLowerCase();

    if (cmd === "status" || cmd === "stats") {
      const topMembers = Object.entries(th.activeMembers || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count], i) => `${i + 1}. ${name} → ${count} messages`)
        .join("\n") || "কোনো ডেটা নেই";

      const topTopics = Object.entries(th.topics || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([topic, count]) => `\( {topic} ( \){count})`)
        .join(", ") || "কোনো টপিক নেই";

      return message.reply(
`📊 **Group Data Status**

👥 মোট সদস্য: ${Object.keys(th.members).length}
💬 মোট মেসেজ: ${th.messageCount || 0}
📅 ইভেন্ট: ${th.events.length}
🌐 ভাষা: ${th.language}

🏆 সবচেয়ে সক্রিয় সদস্য:
${topMembers}

🔥 জনপ্রিয় টপিক:
${topTopics}`
      );
    }

    if (cmd === "clear") {
      memory.delete(event.threadID);
      saveMemory();
      return message.reply("✅ এই গ্রুপের সব ডেটা মুছে ফেলা হয়েছে।");
    }

    return message.reply(
`📂 **GroupAI Data Collector**

এই কমান্ড শুধু গ্রুপের তথ্য জমা করে।
কোনো অটো রিপ্লাই দেয় না।

ব্যবহার:
• groupai status / stats → গ্রুপের তথ্য দেখুন
• groupai clear → এই গ্রুপের ডেটা মুছুন`
    );
  },

  // শুধু ডেটা জমা করবে, কোনো রিপ্লাই দেবে না
  onChat: async function ({ api, event, usersData }) {
    if (!event.body?.trim()) return;

    const { threadID, senderID, body } = event;
    const botID = api.getCurrentUserID();

    // বট নিজে কথা বললে স্কিপ
    if (senderID === botID) return;

    const th = getThread(threadID);

    // সদস্যের নাম সেভ
    if (!th.members[senderID]) {
      try {
        const name = await usersData.getName(senderID);
        if (name) th.members[senderID] = name;
      } catch (e) {}
    }

    const senderName = th.members[senderID] || "সদস্য";
    addMessage(threadID, senderName, body, senderID);

    // এখানে কোনো রিপ্লাই নেই
  }
};
