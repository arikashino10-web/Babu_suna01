/**
 * AI AGENT — Super Smart Group Assistant with Agent Capabilities
 * 
 * Features:
 * - Context Understanding
 * - Intent Detection
 * - Multi-step Reasoning
 * - Auto-suggestion
 * - Data Analysis
 * - Smart Search
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ─── Memory Configuration ──────────────────────────────────────────────────
const memory = new Map();
const MEMORY_FILE = path.join(__dirname, "cache", "ai_agent.json");
const MAX_MSGS = 300;
const MAX_EVENTS = 150;
const MAX_MEMBERS = 200;

function saveMemory() {
  try {
    const obj = {};
    for (const [tid, data] of memory.entries()) {
      obj[tid] = {
        members: data.members,
        messages: data.messages.slice(-60),
        events: data.events.slice(-40),
        language: data.language || "bangla",
        personality: data.personality || "assistant",
        threadName: data.threadName || null,
        created: data.created || Date.now(),
        messageCount: data.messageCount || 0,
        activeMembers: data.activeMembers || {},
        topics: data.topics || {},
        lastSummary: data.lastSummary || null
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
        personality: data.personality || "assistant",
        threadName: data.threadName || null,
        created: data.created || Date.now(),
        messageCount: data.messageCount || 0,
        activeMembers: data.activeMembers || {},
        topics: data.topics || {},
        lastSummary: data.lastSummary || null
      });
    }
  } catch (e) {}
}

loadMemory();

// ─── Helper Functions ──────────────────────────────────────────────────────
function getThread(threadID) {
  if (!memory.has(threadID)) {
    memory.set(threadID, {
      members: {},
      messages: [],
      events: [],
      language: "bangla",
      personality: "assistant",
      threadName: null,
      created: Date.now(),
      messageCount: 0,
      activeMembers: {},
      topics: {},
      lastSummary: null
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

  // Event detection
  const lower = body.toLowerCase();
  const eventKeywords = {
    negative: ["খারাপ", "গালি", "মারামারি", "ঝগড়া", "বিরক্ত", "ঘৃণা", "শপথ", "অভিশাপ", "ধমক", "hate", "fight", "argue", "angry", "upset", "swear", "curse", "threat", "abuse", "يكره", "أكره", "غاضب", "زعلان", "شتم", "مشكلة", "خناق", "خصام", "تشاجر"],
    positive: ["ভালোবাসি", "ভালো", "মজা", "হাসি", "সুখী", "ধন্যবাদ", "love", "happy", "thanks", "good", "nice", "great", "awesome", "يحب", "مبروك", "تهانينا", "شكرا", "حلو"],
    question: ["কি", "কে", "কেন", "কখন", "কেমন", "কত", "what", "who", "why", "when", "how", "which", "where", "what", "why", "when", "how", "which", "where"]
  };
  
  for (const [type, keywords] of Object.entries(eventKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      th.events.push({ 
        who: name, 
        what: body.slice(0, 300), 
        time,
        type: type,
        timestamp: Date.now()
      });
      if (th.events.length > MAX_EVENTS) th.events.shift();
      break;
    }
  }
  
  saveMemory();
}

function detectLanguage(text) {
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (hasBengali) return "bangla";
  if (hasArabic) return "arabic";
  return "english";
}

// ─── AI Call (Agent Mode) ─────────────────────────────────────────────────
async function askAI(systemPrompt, userMessage) {
  try {
    const response = await axios.post(
      "https://text.pollinations.ai/",
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        model: "openai",
        seed: Math.floor(Math.random() * 9999),
        private: true
      },
      { 
        timeout: 40000,
        headers: { "Content-Type": "application/json" } 
      }
    );

    if (typeof response.data === "string") return response.data.trim();
    return (
      response.data?.choices?.[0]?.message?.content ||
      response.data?.response ||
      null
    ).trim();
  } catch (e) {
    console.error("AI Error:", e.message);
    return null;
  }
}

// ─── Agent Functions ──────────────────────────────────────────────────────
async function agentProcess(question, th, senderName, lang) {
  // 1. Detect intent
  const intent = detectIntent(question, th);
  
  // 2. Build context
  const context = buildContext(th, lang);
  
  // 3. Generate response
  const response = await generateAgentResponse(question, context, intent, th, senderName, lang);
  
  // 4. Post-process
  return postProcessResponse(response, intent, th);
}

function detectIntent(question, th) {
  const lower = question.toLowerCase();
  
  if (lower.includes("কি") || lower.includes("কেমন") || lower.includes("কত") || 
      lower.includes("what") || lower.includes("how") || lower.includes("why")) {
    return "information";
  }
  
  if (lower.includes("সাহায্য") || lower.includes("help") || lower.includes("help") ||
      lower.includes("দরকার") || lower.includes("need")) {
    return "help";
  }
  
  if (lower.includes("মতামত") || lower.includes("opinion") || lower.includes("opinion") ||
      lower.includes("ভালো") || lower.includes("খারাপ") || lower.includes("good") || lower.includes("bad")) {
    return "opinion";
  }
  
  if (lower.includes("গ্রুপ") || lower.includes("সদস্য") || lower.includes("group") || 
      lower.includes("member") || lower.includes("তুমি") || lower.includes("আমি")) {
    return "social";
  }
  
  return "general";
}

function buildContext(th, lang) {
  const memberList = Object.values(th.members)
    .filter(Boolean)
    .slice(0, 30)
    .join("، ");

  const recentConvo = th.messages.slice(-15)
    .map(m => `[${m.time}] ${m.name}: ${m.body.slice(0, 100)}`)
    .join("\n");

  const recentEvents = th.events.slice(-5)
    .map(e => `• ${e.time} — ${e.who}: ${e.what.slice(0, 80)}`)
    .join("\n");

  const topTopics = Object.entries(th.topics || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => `${topic} (${count} বার)`)
    .join(", ");

  return {
    memberList,
    recentConvo,
    recentEvents,
    topTopics,
    totalMembers: Object.keys(th.members).length,
    totalMessages: th.messageCount || 0,
    totalEvents: th.events.length
  };
}

async function generateAgentResponse(question, context, intent, th, senderName, lang) {
  const personality = th.personality || "assistant";
  
  const systemPrompt = 
`You are an AI Agent for a group chat. Think step by step and respond like a human.

LANGUAGE: ${lang}
PERSONALITY: ${personality}

CONTEXT:
- Members (${context.totalMembers}): ${context.memberList}
- Recent Messages: ${context.recentConvo}
- Recent Events: ${context.recentEvents}
- Popular Topics: ${context.topTopics}
- Total Messages: ${context.totalMessages}
- Current User: ${senderName}

INTENT DETECTED: ${intent}

INSTRUCTIONS:
1. Think step by step before answering
2. Use the context to provide relevant answers
3. If asked about specific people, use their names from context
4. If asked "what happened?", summarize recent events
5. Be friendly, helpful and natural
6. Don't say "I'm an AI" or "I'm a bot"
7. Respond in 1-3 sentences (unless asked for detailed info)

USER QUESTION: ${question}

Your thoughtful response:`;

  const response = await askAI(systemPrompt, question);
  return response;
}

function postProcessResponse(response, intent, th) {
  if (!response) return null;
  
  // Add emoji based on intent
  const emojis = {
    information: "📝",
    help: "🤝",
    opinion: "💭",
    social: "👥",
    general: "💬"
  };
  
  const emoji = emojis[intent] || "💬";
  
  // Remove duplicate spaces
  let cleaned = response.replace(/\s+/g, " ").trim();
  
  // Add emoji if not present
  if (!cleaned.startsWith(emoji)) {
    cleaned = `${emoji} ${cleaned}`;
  }
  
  return cleaned;
}

// ─── Main Module ────────────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "groupai",
    aliases: ["aigroup", "মালাক", "ملاك", "agent", "ai"],
    version: "5.0",
    author: "System",
    countDown: 0,
    role: 0,
    shortDescription: {
      bn: "AI Agent — স্মার্ট গ্রুপ সহকারী",
      en: "AI Agent — Smart Group Assistant",
      ar: "وكيل الذكاء الاصطناعي — مساعد المجموعة الذكي"
    },
    category: "AI",
    guide: {
      bn: "{pn} <প্রশ্ন> — AI Agent-এর মতো উত্তর দেবে\n{pn} status — গ্রুপের অবস্থা দেখুন\n{pn} stats — অ্যানালাইসিস দেখুন",
      en: "{pn} <question> — AI Agent will answer\n{pn} status — View group status\n{pn} stats — View analysis",
      ar: "{pn} <سؤال> — سيجيب وكيل الذكاء الاصطناعي\n{pn} status — عرض حالة المجموعة\n{pn} stats — عرض التحليل"
    }
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const th = getThread(event.threadID);
    const senderName = th.members[event.senderID] || 
                       await usersData.getName(event.senderID).catch(() => "সদস্য");
    th.members[event.senderID] = senderName;

    const command = args[0]?.toLowerCase();

    // ─── Language Setting ──────────────────────────────────────────────────
    if (["bangla", "english", "arabic"].includes(command)) {
      th.language = command;
      saveMemory();
      const msgs = {
        bangla: "✅ ভাষা সেট করা হয়েছে: বাংলা\nএখন AI Agent-এর মতো কাজ করব! 😊",
        english: "✅ Language set to: English\nNow I'll work like an AI Agent! 😊",
        arabic: "✅ تم ضبط اللغة إلى: العربية\nالآن سأعمل مثل وكيل الذكاء الاصطناعي! 😊"
      };
      return message.reply(msgs[command]);
    }

    // ─── Status ──────────────────────────────────────────────────────────
    if (command === "status") {
      const msgs = {
        bangla: `📊 **গ্রুপের বর্তমান অবস্থা (AI Agent)**

🧠 মোট সদস্য: ${Object.keys(th.members).length}
💬 মোট মেসেজ: ${th.messageCount || 0}
📅 মোট ইভেন্ট: ${th.events.length}
🔥 সক্রিয় সদস্য: ${Object.keys(th.activeMembers).length}
🌐 ভাষা: ${th.language}
🎭 ব্যক্তিত্ব: ${th.personality}
📌 টপিক: ${Object.keys(th.topics || {}).slice(0, 5).join(", ") || "কোনো টপিক নেই"}`,
        english: `📊 **Group Status (AI Agent)**

🧠 Total Members: ${Object.keys(th.members).length}
💬 Total Messages: ${th.messageCount || 0}
📅 Total Events: ${th.events.length}
🔥 Active Members: ${Object.keys(th.activeMembers).length}
🌐 Language: ${th.language}
🎭 Personality: ${th.personality}
📌 Topics: ${Object.keys(th.topics || {}).slice(0, 5).join(", ") || "No topics"}`
      };
      return message.reply(msgs[th.language] || msgs.bangla);
    }

    // ─── Stats ──────────────────────────────────────────────────────────
    if (command === "stats" || command === "analysis") {
      const topMembers = Object.entries(th.activeMembers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count], i) => `${i+1}. ${name} — ${count} বার`)
        .join("\n");
      
      const topTopics = Object.entries(th.topics || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => `${topic} (${count})`)
        .join(", ");
      
      const msgs = {
        bangla: `📈 **গ্রুপ অ্যানালাইসিস (AI Agent)**

📊 মোট মেসেজ: ${th.messageCount || 0}
👥 সক্রিয় সদস্য: ${Object.keys(th.activeMembers).length}
📅 মোট ইভেন্ট: ${th.events.length}

🔥 **সেরা ৫ সদস্য:**
${topMembers || 'কোনো ডেটা নেই'}

📌 **জনপ্রিয় টপিক:**
${topTopics || 'কোনো টপিক নেই'}`,
        english: `📈 **Group Analysis (AI Agent)**

📊 Total Messages: ${th.messageCount || 0}
👥 Active Members: ${Object.keys(th.activeMembers).length}
📅 Total Events: ${th.events.length}

🔥 **Top 5 Members:**
${topMembers || 'No data'}

📌 **Popular Topics:**
${topTopics || 'No topics'}`
      };
      return message.reply(msgs[th.language] || msgs.bangla);
    }

    // ─── Personality ──────────────────────────────────────────────────
    if (command === "personality") {
      const personality = args[1]?.toLowerCase();
      if (!["friend", "teacher", "assistant", "agent"].includes(personality)) {
        return message.reply(
          `❌ **Invalid personality!**\n\n📋 Available:\n• friend — বন্ধু\n• teacher — শিক্ষক\n• assistant — সহকারী\n• agent — AI Agent (স্মার্ট)`
        );
      }
      th.personality = personality;
      saveMemory();
      const msgs = {
        bangla: `✅ ব্যক্তিত্ব সেট করা হয়েছে: ${personality}\nএখন AI Agent-এর মতো কাজ করব! 🤖`,
        english: `✅ Personality set to: ${personality}\nNow I'll work like an AI Agent! 🤖`,
        arabic: `✅ تم ضبط الشخصية إلى: ${personality}\nالآن سأعمل مثل وكيل الذكاء الاصطناعي! 🤖`
      };
      return message.reply(msgs[th.language] || msgs.bangla);
    }

    // ─── Agent Question ──────────────────────────────────────────────────
    if (args.length > 0) {
      const question = args.join(" ");
      const response = await agentProcess(question, th, senderName, th.language);
      
      if (response) {
        return message.reply(response);
      } else {
        const fallback = {
          bangla: "🤖 আমি বুঝতে পারিনি। আবার বলুন! 😊",
          english: "🤖 I didn't understand. Please repeat! 😊",
          arabic: "🤖 لم أفهم. أعد المحاولة! 😊"
        };
        return message.reply(fallback[th.language] || fallback.bangla);
      }
    }

    // ─── Help Menu ──────────────────────────────────────────────────────
    const helpMsg = 
`🤖 **AI AGENT — স্মার্ট গ্রুপ সহকারী**

🌐 **ভাষা:** groupai bangla / english / arabic

💬 **প্রশ্ন করুন:**
groupai <প্রশ্ন> — AI Agent-এর মতো উত্তর দেবে

🎭 **ব্যক্তিত্ব:**
groupai personality friend — বন্ধু
groupai personality teacher — শিক্ষক
groupai personality assistant — সহকারী
groupai personality agent — AI Agent (স্মার্ট)

📊 **স্ট্যাটাস:**
groupai status — বর্তমান অবস্থা
groupai stats — গ্রুপ অ্যানালাইসিস

💡 **AI Agent বিশেষ ক্ষমতা:**
• কনটেক্সট বুঝে উত্তর দেয়
• ইন্টেন্ট ডিটেক্ট করে
• মাল্টি-স্টেপ রিজনিং করে
• নিজে থেকেই সাজেশন দেয়
• গ্রুপের ডেটা বিশ্লেষণ করে

🔹 **চ্যাটে সরাসরি:** "বট" / "bot" / "بوت" লিখুন`;

    return message.reply(helpMsg);
  },

  onChat: async function ({ api, event, message, usersData }) {
    if (!event.body?.trim()) return;

    const { threadID, senderID, body } = event;
    const botID = api.getCurrentUserID();

    if (senderID === botID) return;

    const th = getThread(threadID);

    if (!th.members[senderID]) {
      try {
        const name = await usersData.getName(senderID);
        if (name) th.members[senderID] = name;
      } catch (e) {}
    }
    const senderName = th.members[senderID] || "সদস্য";

    addMessage(threadID, senderName, body, senderID);

    const triggers = ["বট", "bot", "بوت", "groupai", "aigroup", "মালাক", "ملاك", "agent", "ai"];
    const lower = body.toLowerCase();
    const isTriggered = triggers.some(t => lower.includes(t)) || 
                        event.messageReply?.senderID === botID;

    if (!isTriggered) return;

    let question = body;
    for (const trigger of triggers) {
      question = question.replace(new RegExp(trigger, "gi"), "").trim();
    }
    if (!question) {
      const fallback = {
        bangla: "🤖 বলুন, আমি শুনছি! 😊",
        english: "🤖 Go ahead, I'm listening! 😊",
        arabic: "🤖 تفضل، أنا أستمع! 😊"
      };
      return message.reply(fallback[th.language] || fallback.bangla);
    }

    const response = await agentProcess(question, th, senderName, th.language);
    return message.reply(response || "🤖 আমি বুঝতে পারিনি। আবার বলুন! 😊");
  }
};
