/**
 * Advanced GroupAI — Multilingual Smart Assistant
 * Supports: বাংলা (Bangla) | English | العربية (Arabic)
 * Enhanced Memory: 100 messages + 50 events per thread
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// ─── Enhanced Memory Configuration ──────────────────────────────────────────
const memory = new Map();
const MEMORY_FILE = path.join(__dirname, "cache", "groupai_advanced.json");
const MAX_MSGS = 100;      // বর্ধিত: ৪০ থেকে ১০০
const MAX_EVENTS = 50;     // বর্ধিত: ৩০ থেকে ৫০

// ─── Persistent Memory Functions ────────────────────────────────────────────
function saveMemory() {
  try {
    const obj = {};
    for (const [tid, data] of memory.entries()) {
      obj[tid] = {
        members: data.members,
        messages: data.messages.slice(-30),
        events: data.events.slice(-20),
        threadName: data.threadName || null,
        created: data.created || Date.now()
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
        threadName: data.threadName || null,
        created: data.created || Date.now()
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
      threadName: null,
      created: Date.now()
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
  
  th.messages.push({ 
    name, 
    body: body.slice(0, 500), 
    time, 
    id,
    timestamp: Date.now()
  });
  
  if (th.messages.length > MAX_MSGS) th.messages.shift();

  // ─── Enhanced Event Detection (Multilingual) ────────────────────────────
  const lower = body.toLowerCase();
  
  // বাংলা ইভেন্ট কীওয়ার্ড
  const bnEvents = ["খারাপ", "গালি", "মারামারি", "ঝগড়া", "বিরক্ত", "ভালোবাসি", "ঘৃণা", "শপথ", "অভিশাপ", "ধমক"];
  // ইংরেজি ইভেন্ট কীওয়ার্ড
  const enEvents = ["hate", "love", "fight", "argue", "angry", "upset", "swear", "curse", "threat", "abuse"];
  // আরবি ইভেন্ট কীওয়ার্ড
  const arEvents = ["يكره", "أكره", "يحب", "غاضب", "زعلان", "شتم", "مشكلة", "خناق", "خصام", "تشاجر"];
  
  const allEvents = [...bnEvents, ...enEvents, ...arEvents];
  
  if (allEvents.some(k => lower.includes(k))) {
    th.events.push({ 
      who: name, 
      what: body.slice(0, 300), 
      time,
      timestamp: Date.now()
    });
    if (th.events.length > MAX_EVENTS) th.events.shift();
    saveMemory();
  }
}

// ─── Multilingual Bot Triggers ─────────────────────────────────────────────
const TRIGGERS = {
  bn: ["বট", "হ্যালো বট", "ওহে বট", "বট বল", "এই বট", "শুন বট"],
  en: ["bot", "hello bot", "hey bot", "bot say", "hi bot", "bot tell"],
  ar: ["يا بوت", "مرحبا بوت", "هلا بوت", "بوت", "بوت؟"]
};

const ALL_TRIGGERS = [...TRIGGERS.bn, ...TRIGGERS.en, ...TRIGGERS.ar];

function isBotTriggered(body, botID, replyID) {
  if (replyID === botID) return true;
  const lower = body.toLowerCase();
  return ALL_TRIGGERS.some(t => lower.includes(t.toLowerCase()));
}

function detectLanguage(text) {
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  
  if (hasBengali) return "bn";
  if (hasArabic) return "ar";
  return "en";
}

// ─── AI Call (Enhanced Pollinations) ──────────────────────────────────────
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
        timeout: 30000,  // বর্ধিত: ২৫ থেকে ৩০ সেকেন্ড
        headers: { "Content-Type": "application/json" } 
      }
    );

    if (typeof response.data === "string") return response.data.trim();
    return (
      response.data?.choices?.[0]?.message?.content ||
      response.data?.response ||
      "📝 আমি বুঝতে পারিনি। আবার বলুন। / I didn't understand. Please repeat. / لم أفهم. أعد المحاولة."
    ).trim();
  } catch (e) {
    console.error("AI Error:", e.message);
    return "⚠️ সার্ভার ব্যস্ত। একটু পর চেষ্টা করুন। / Server busy. Try again later. / الخادم مشغول. حاول لاحقاً.";
  }
}

// ─── Fallback Replies (Multilingual) ──────────────────────────────────────
const FALLBACKS = {
  bn: [
    "হ্যালো! 😊 আমি কিভাবে সাহায্য করতে পারি?",
    "আমি আছি! কি বলবেন? 🌸",
    "জ্বি, বলুন তো! 😄",
    "কী খবর? আমি শুনছি! 🙂",
    "বলুন, আমি আপনাকে সাহায্য করতে পারি! 💫"
  ],
  en: [
    "Hello! 😊 How can I help you?",
    "I'm here! What would you like to say? 🌸",
    "Yes, go ahead! 😄",
    "What's up? I'm listening! 🙂",
    "Tell me, I can help you! 💫"
  ],
  ar: [
    "مرحبا! 😊 كيف يمكنني مساعدتك؟",
    "أنا هنا! ماذا تريد أن تقول؟ 🌸",
    "نعم، تفضل! 😄",
    "ما الأخبار؟ أنا أستمع! 🙂",
    "قل لي، يمكنني مساعدتك! 💫"
  ]
};

// ─── Main Module Export ────────────────────────────────────────────────────
module.exports = {
  config: {
    name: "groupai",
    aliases: ["aigroup", "মালাক", "ملاك", "ga", "gai"],
    version: "3.0",
    author: "System",
    countDown: 0,
    role: 0,
    shortDescription: {
      bn: "স্মার্ট গ্রুপ সহকারী (বাংলা + ইংরেজি + আরবি)",
      en: "Smart Group Assistant (Bangla + English + Arabic)",
      ar: "مساعد ذكي للمجموعة (بنغالية + إنجليزية + عربية)"
    },
    longDescription: {
      bn: "একটি বুদ্ধিমান গ্রুপ সহকারী যা সদস্যদের মনে রাখে, কথোপকথন ট্র্যাক করে এবং তিন ভাষায় উত্তর দেয়।",
      en: "An intelligent group assistant that remembers members, tracks conversations, and responds in three languages.",
      ar: "مساعد ذكي للمجموعة يتذكر الأعضاء، ويتتبع المحادثات، ويرد بثلاث لغات."
    },
    category: "AI",
    guide: {
      bn: "{pn} [আপনার প্রশ্ন] — অথবা চ্যাটে 'বট' লিখে কথা বলুন",
      en: "{pn} [your question] — Or just type 'bot' in chat to talk",
      ar: "{pn} [سؤالك] — أو فقط اكتب 'بوت' في الدردشة للتحدث"
    }
  },

  // ── Direct Command: groupai <question> ──────────────────────────────────
  onStart: async function ({ api, event, args, message, usersData }) {
    const question = args.join(" ").trim();
    if (!question) {
      const helpMsg = 
`🤖 **স্মার্ট গ্রুপ সহকারী** / **Smart Group Assistant** / **مساعد المجموعة الذكي**

🌐 **ভাষা / Language / اللغة:** বাংলা | English | العربية

📝 **ব্যবহার / Usage / الاستخدام:**
• {pn} [প্রশ্ন / question / سؤال]
• চ্যাটে "বট" বা "bot" বা "بوت" লিখে কথা বলুন
• / Type "bot" or "بوت" in chat to talk

💡 **উদাহরণ / Example / مثال:**
{pn} আজকের আবহাওয়া কেমন?
{pn} Who is the admin?
{pn} كيف الحال؟`;

      return message.reply(helpMsg);
    }

    const th = getThread(event.threadID);
    const senderName = th.members[event.senderID] || 
                       await usersData.getName(event.senderID).catch(() => "সদস্য");
    th.members[event.senderID] = senderName;

    await _respond(api, event, message, th, senderName, question);
  },

  // ── Background Chat Monitor ──────────────────────────────────────────────
  onChat: async function ({ api, event, message, usersData }) {
    if (!event.body?.trim()) return;

    const { threadID, senderID, body } = event;
    const botID = api.getCurrentUserID();

    // Don't respond to own messages
    if (senderID === botID) return;

    const th = getThread(threadID);

    // Track sender name
    if (!th.members[senderID]) {
      try {
        const name = await usersData.getName(senderID);
        if (name) th.members[senderID] = name;
      } catch (e) {}
    }
    const senderName = th.members[senderID] || "সদস্য";

    // Store message
    addMessage(threadID, senderName, body, senderID);

    // Check if bot was addressed
    const replyToID = event.messageReply?.senderID;
    if (!isBotTriggered(body, botID, replyToID)) return;

    // Extract the actual question
    let question = body;
    for (const trigger of ALL_TRIGGERS) {
      question = question.replace(new RegExp(trigger, "gi"), "").trim();
    }
    if (!question) question = "হ্যালো! / Hello! / مرحبا!";

    await _respond(api, event, message, th, senderName, question);
  }
};

// ─── Core Response Function ────────────────────────────────────────────────
async function _respond(api, event, message, th, senderName, question) {
  try {
    api.setMessageReaction("💭", event.messageID, () => {}, true);

    // Detect user's language
    const userLang = detectLanguage(question);

    // Build enhanced context
    const memberList = Object.values(th.members)
      .filter(Boolean)
      .slice(0, 50)
      .join("، ") || "কেউ নেই / No one / لا أحد";

    const recentConvo = th.messages.slice(-25)
      .map(m => `[${m.time}] ${m.name}: ${m.body.slice(0, 100)}`)
      .join("\n") || "কোনো কথোপকথন নেই / No conversation / لا محادثة";

    const notableEvents = th.events.slice(-10)
      .map(e => `• ${e.time} — ${e.who}: "${e.what.slice(0, 80)}"`)
      .join("\n") || "কোনো ইভেন্ট নেই / No events / لا أحداث";

    // ─── Enhanced System Prompt (Trilingual) ──────────────────────────────
    const systemPrompt = 
`You are "Smart Assistant", a helpful AI for this chat group. 
You respond in the SAME LANGUAGE as the user's question (Bangla/English/Arabic).

Group Members: ${memberList}

Recent Messages:
${recentConvo}

Recent Events:
${notableEvents}

Rules:
1. Respond naturally and shortly (1-3 sentences)
2. Use the SAME language as the user's question
3. Don't say you're an AI or bot
4. Be friendly and helpful
5. If asked about specific people, mention what they said
6. If asked "what happened?", summarize recent events
7. Don't repeat yourself or be too formal

Current user: ${senderName}`;

    // Get AI response
    const reply = await askAI(systemPrompt, question);

    api.setMessageReaction("✅", event.messageID, () => {}, true);
    return message.reply(reply);

  } catch (err) {
    console.error("[GroupAI] Error:", err.message);
    api.setMessageReaction("", event.messageID, () => {}, true);
    
    // Fallback in user's language
    const lang = detectLanguage(question || "hello");
    const fallback = FALLBACKS[lang] || FALLBACKS.en;
    return message.reply(fallback[Math.floor(Math.random() * fallback.length)]);
  }
    }
