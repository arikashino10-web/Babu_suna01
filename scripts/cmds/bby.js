const axios = require("axios");

const COMMAND_NAME = "baby";
const SESSION_TTL = 30 * 60 * 1000;
const SAHU_API_LIST = "https://gitlab.com/shahadat-sahu/sahu-api/-/raw/main/API.json";
const NOOBS_API = "https://noobs-api.top/dipto";
const SECONDARY_API = "https://baby-apisx.vercel.app";
const SIMSIM_API = "https://simsimi-api-tjb1.onrender.com";
const TRIGGERS = ["baby", "bby", "babu", "bbu", "bot", "jan", "janu", "জান", "জানু", "বেবি", "wifey", "hinata", "hina", "suna", "sara", "mikasa", "alya"];
const LOCAL_FALLBACK_REPLIES = [
  "এই মুহূর্তে baby API-গুলো busy, তবুও আমি তোমার কথা শুনছি 😌",
  "API একটু ঘুমাচ্ছে জানু, আবার বলো তো 🥺",
  "সব online reply service ব্যস্ত—local baby reply চালু আছে 💖",
  "আমি আছি, API না থাকলেও তোমাকে ignore করছি না 😚"
];

const sessions = new Map();
const autoTeachUsers = new Set();
let sahuBaseCache = null;
let sahuBaseCheckedAt = 0;

function sessionKey(event) {
  return String(event.threadID) + ":" + String(event.senderID || event.userID);
}

function activateSession(event) {
  sessions.set(sessionKey(event), Date.now() + SESSION_TTL);
}

function isSessionActive(event) {
  const key = sessionKey(event);
  const expiresAt = sessions.get(key);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(key);
    return false;
  }
  return true;
}

function clearSession(event) {
  sessions.delete(sessionKey(event));
  autoTeachUsers.delete(sessionKey(event));
}

function isStopText(text) {
  return /^(stop|off|বন্ধ|থাম|থামো)$/i.test(String(text || "").trim());
}

function getTriggerText(text) {
  const normalized = String(text || "").trim();
  const lower = normalized.toLowerCase();
  for (const trigger of TRIGGERS) {
    const name = trigger.toLowerCase();
    if (lower === name) return "";
    if (lower.startsWith(name + " ")) return normalized.slice(trigger.length).trim();
  }
  return null;
}

function cleanBase(url) {
  return String(url || "").replace(/\/+$/, "");
}

async function getSahuBase() {
  const now = Date.now();
  if (sahuBaseCache && now - sahuBaseCheckedAt < 5 * 60 * 1000) return sahuBaseCache;
  const response = await axios.get(SAHU_API_LIST, { timeout: 10000 });
  const base = response.data && response.data.simsimi;
  if (!base) throw new Error("Sahu API base URL is unavailable");
  sahuBaseCache = cleanBase(base);
  sahuBaseCheckedAt = now;
  return sahuBaseCache;
}

function extractReplies(payload) {
  if (!payload || typeof payload !== "object") return [];
  const raw = payload.response ?? payload.reply ?? payload.text ?? payload.data?.reply ?? payload.data?.response;
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(value => String(value || "").trim()).filter(value => value && !/undefined|internal server error|cannot read propert/i.test(value));
}

function isBadPayload(payload) {
  if (!payload || typeof payload !== "object") return true;
  if (payload.error) return true;
  return extractReplies(payload).length === 0;
}

async function getChatReplies(text, event, senderName) {
  const encoded = encodeURIComponent(text);
  const sender = encodeURIComponent(String(event.senderID || ""));
  const thread = encodeURIComponent(String(event.threadID || ""));
  const name = encodeURIComponent(String(senderName || "User"));
  const requests = [
    async () => {
      const base = await getSahuBase();
      return (await axios.get(base + "/simsimi?text=" + encoded + "&senderName=" + name + "&senderID=" + sender + "&threadID=" + thread, { timeout: 15000 })).data;
    },
    async () => (await axios.get(NOOBS_API + "/baby?text=" + encoded + "&senderID=" + sender + "&threadID=" + thread + "&font=1", { timeout: 12000 })).data,
    async () => (await axios.get(SECONDARY_API + "/baby?text=" + encoded + "&senderID=" + sender + "&threadID=" + thread + "&font=1", { timeout: 12000 })).data,
    async () => (await axios.get(SIMSIM_API + "/simsimi?text=" + encoded + "&senderName=" + name, { timeout: 12000 })).data
  ];
  let lastError = null;
  for (const request of requests) {
    try {
      const payload = await request();
      if (!isBadPayload(payload)) return extractReplies(payload);
      lastError = new Error("The API returned an empty response");
    } catch (error) {
      lastError = error;
    }
  }
  console.error("baby API fallback exhausted:", lastError?.message || "unknown error");
  return [LOCAL_FALLBACK_REPLIES[Math.floor(Math.random() * LOCAL_FALLBACK_REPLIES.length)]];
}

async function getAttachmentReply(event) {
  const type = event.attachments?.[0]?.type;
  let endpoint = null;
  if (type === "sticker") endpoint = "sticker";
  if (type === "photo" || type === "animated_image") endpoint = "picture";
  if (!endpoint) return null;
  try {
    const response = await axios.get(SECONDARY_API + "/baby/" + endpoint + "?senderID=" + encodeURIComponent(event.senderID), { timeout: 10000 });
    const replies = extractReplies(response.data);
    if (replies.length) return replies;
  } catch {}
  const fallback = {
    photo: ["ছবিটা দেখলাম 😌", "এই ছবির জন্য আলাদা reply লাগবে নাকি? 🥰"],
    animated_image: ["GIF-টা মজার হয়েছে 😂", "এটা দেখে হাসি থামছে না 😄"],
    sticker: ["Cute sticker 😌", "Sticker দিয়ে কথা বলা শিখে গেছো দেখি 🤭"]
  };
  return [fallback[type]?.[Math.floor(Math.random() * fallback[type].length)] || "দেখলাম জানু 😌"];
}

function registerReply(info, event) {
  if (!info?.messageID || !global.GoatBot?.onReply) return;
  global.GoatBot.onReply.set(info.messageID, {
    commandName: COMMAND_NAME,
    type: "reply",
    messageID: info.messageID,
    author: event.senderID
  });
}

function sendMessage(api, event, payload) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, info) => {
      if (settled) return;
      settled = true;
      if (error) return reject(error);
      registerReply(info, event);
      resolve(info);
    };
    try {
      const result = api.sendMessage(payload, event.threadID, finish, event.messageID);
      if (result && typeof result.then === "function") result.then(info => finish(null, info)).catch(finish);
    } catch (error) {
      finish(error);
    }
  });
}

async function sendReplies(api, event, replies) {
  for (const reply of replies.filter(Boolean)) await sendMessage(api, event, reply);
}

async function setTyping(api, threadID, enabled) {
  try {
    if (typeof api.sendTypingIndicator === "function") await api.sendTypingIndicator(threadID, enabled);
  } catch {}
}

async function getUserName(usersData, userID) {
  try { return await usersData.getName(userID) || "User"; } catch { return "User"; }
}

function mention(name, userID, text) {
  return { body: "『 " + name + " 』\n\n" + text, mentions: [{ tag: name, id: userID }] };
}

async function teachSahu(trigger, reply, event) {
  const base = await getSahuBase();
  return (await axios.get(base + "?teach=" + encodeURIComponent(trigger) + "&reply=" + encodeURIComponent(reply) + "&senderID=" + encodeURIComponent(event.senderID) + "&threadID=" + encodeURIComponent(event.threadID), { timeout: 12000 })).data;
}

async function runCommandAction({ api, event, args, usersData }) {
  const raw = args.join(" ").trim();
  const lower = raw.toLowerCase();
  const first = String(args[0] || "").toLowerCase();
  const uid = event.senderID;
  const name = await getUserName(usersData, uid);

  if (isStopText(raw)) {
    clearSession(event);
    return sendMessage(api, event, "✅ bby conversation বন্ধ করা হয়েছে। আবার bby লিখলে চালু হবে।");
  }

  activateSession(event);

  if (first === "autoteach") {
    const mode = String(args[1] || "").toLowerCase();
    if (!["on", "off"].includes(mode)) return sendMessage(api, event, "ব্যবহার: baby autoteach on অথবা baby autoteach off");
    if (mode === "on") autoTeachUsers.add(sessionKey(event));
    else autoTeachUsers.delete(sessionKey(event));
    return sendMessage(api, event, "✅ Auto-teach " + (mode === "on" ? "ON 🟢" : "OFF 🔴") + " করা হয়েছে।");
  }

  if (!raw) {
    return sendMessage(api, event, mention(name, uid, ["Bolo baby 💖", "Hea baby 😚", "Yes, I'm here 😘", "Ki khobor janu? 🥰"][Math.floor(Math.random() * 4)]));
  }

  try {
    const base = await getSahuBase();
    if (first === "remove" && args.length > 1) {
      const key = raw.replace(/^remove\s+/i, "");
      const data = (await axios.get(base + "?remove=" + encodeURIComponent(key) + "&senderID=" + encodeURIComponent(uid), { timeout: 12000 })).data;
      return sendMessage(api, event, data.message || "✅ Removed.");
    }

    if (first === "rm" && lower.includes("-")) {
      const parts = lower.replace(/^rm\s+/i, "").split(/\s*-\s*/);
      const data = (await axios.get(base + "?remove=" + encodeURIComponent(parts[0]) + "&index=" + encodeURIComponent(parts[1] || ""), { timeout: 12000 })).data;
      return sendMessage(api, event, data.message || "✅ Removed.");
    }

    if (first === "list") {
      const data = (await axios.get(base + "?list=all", { timeout: 12000 })).data || {};
      if (String(args[1] || "").toLowerCase() === "all") {
        const list = data.teacher?.teacherList || [];
        const limit = Math.min(parseInt(args[2], 10) || 100, 100);
        const teachers = await Promise.all(list.slice(0, limit).map(async item => {
          const id = Object.keys(item)[0];
          return { name: await getUserName(usersData, id), value: item[id] };
        }));
        teachers.sort((a, b) => b.value - a.value);
        const output = teachers.map((teacher, i) => (i + 1) + ". " + teacher.name + ": " + teacher.value).join("\n");
        return sendMessage(api, event, "👑 Baby teachers\n\n" + (output || "No teachers found."));
      }
      return sendMessage(api, event, "❇️ Total Teach = " + (data.length || data.total || "API unavailable") + "\n♻️ Total Response = " + (data.responseLength || data.totalReplies || "API unavailable"));
    }

    if (first === "msg") {
      const key = raw.replace(/^msg\s+/i, "");
      const data = (await axios.get(base + "?list=" + encodeURIComponent(key), { timeout: 12000 })).data || {};
      return sendMessage(api, event, "Message " + key + " = " + (data.data || data.message || "No reply found."));
    }

    if (first === "edit") {
      const parts = raw.replace(/^edit\s+/i, "").split(/\s*-\s*/);
      if (parts.length < 2) return sendMessage(api, event, "❌ ব্যবহার: baby edit question - new reply");
      const data = (await axios.get(base + "?edit=" + encodeURIComponent(parts[0]) + "&replace=" + encodeURIComponent(parts.slice(1).join(" - ")) + "&senderID=" + encodeURIComponent(uid), { timeout: 12000 })).data;
      return sendMessage(api, event, data.message || "✅ Edited successfully.");
    }

    if (first === "teach" && ["sticker", "picture"].includes(String(args[1] || "").toLowerCase())) {
      const mediaType = String(args[1]).toLowerCase();
      const reply = raw.replace(/^teach\s+(sticker|picture)\s*/i, "").replace(/^-\s*/, "").trim();
      if (!reply) return sendMessage(api, event, "❌ ব্যবহার: baby teach " + mediaType + " - reply");
      const data = (await axios.get(SECONDARY_API + "/baby/" + mediaType + "?teach=1&reply=" + encodeURIComponent(reply) + "&senderID=" + encodeURIComponent(uid), { timeout: 12000 })).data || {};
      return sendMessage(api, event, "✅ " + (data.message || "Media reply added."));
    }

    if (first === "teach" && String(args[1] || "").toLowerCase() === "react") {
      const parts = raw.replace(/^teach\s+react\s+/i, "").split(/\s*-\s*/);
      if (parts.length < 2) return sendMessage(api, event, "❌ ব্যবহার: baby teach react question - ❤️, 😀");
      const data = (await axios.get(base + "?teach=" + encodeURIComponent(parts[0]) + "&react=" + encodeURIComponent(parts.slice(1).join(" - ")), { timeout: 12000 })).data;
      return sendMessage(api, event, "✅ Reacts added: " + (data.message || "Done"));
    }

    if (first === "teach" && String(args[1] || "").toLowerCase() === "amar") {
      const parts = raw.replace(/^teach\s+amar\s+/i, "").split(/\s*-\s*/);
      if (parts.length < 2) return sendMessage(api, event, "❌ ব্যবহার: baby teach amar question - reply");
      const data = (await axios.get(base + "?teach=" + encodeURIComponent(parts[0]) + "&senderID=" + encodeURIComponent(uid) + "&reply=" + encodeURIComponent(parts.slice(1).join(" - ")) + "&key=intro", { timeout: 12000 })).data;
      return sendMessage(api, event, "✅ Intro reply added: " + (data.message || "Done"));
    }

    if (first === "teach") {
      const parts = raw.replace(/^teach\s+/i, "").split(/\s*-\s*/);
      if (parts.length < 2) return sendMessage(api, event, "❌ ব্যবহার: baby teach question - reply1, reply2");
      const data = await teachSahu(parts[0], parts.slice(1).join(" - "), event);
      return sendMessage(api, event, "✅ Replies added: " + (data.message || "Done") + "\n👤 Teacher: " + name + "\n📚 Total: " + (data.teachs || data.total || "N/A"));
    }

    if (["amar name ki", "amr nam ki", "amar nam ki", "amr name ki", "whats my name"].some(value => lower.includes(value))) {
      const data = (await axios.get(base + "?text=amar%20name%20ki&senderID=" + encodeURIComponent(uid) + "&key=intro", { timeout: 12000 })).data;
      return sendMessage(api, event, data.reply || "তোমার নাম আমি এখনো শিখিনি।");
    }
  } catch (error) {
    if (["teach", "edit", "remove", "rm", "list", "msg"].includes(first)) throw error;
  }

  await setTyping(api, event.threadID, true);
  try {
    const replies = event.attachments?.length ? await getAttachmentReply(event) : await getChatReplies(raw, event, name);
    return sendReplies(api, event, replies);
  } finally {
    await setTyping(api, event.threadID, false);
  }
}

module.exports.config = {
  name: "baby",
  aliases: ["bby", "babu", "bbu", "jan", "janu", "bot", "hinata", "hina", "wifey", "bbz"],
  version: "12.0.0",
  author: "Unified community merge",
  countDown: 0,
  role: 0,
  description: "Unified Baby AI with fallback APIs, teaching, media replies and continuous chat",
  category: "chat",
  guide: {
    en: "{pn} [message] | {pn} teach [question] - [reply] | {pn} list [all] | {pn} msg [question] | {pn} edit [question] - [reply] | {pn} remove [question] | {pn} autoteach on/off"
  }
};

module.exports.onStart = async function ({ api, event, args, usersData }) {
  try {
    return await runCommandAction({ api, event, args, usersData });
  } catch (error) {
    console.error("baby onStart error:", error);
    return sendMessage(api, event, "❌ Baby API error: " + (error.message || "Unknown error"));
  }
};

module.exports.onReply = async function ({ api, event, Reply, usersData }) {
  if (Reply?.author && String(Reply.author) !== String(event.senderID)) return;
  const text = String(event.body || "").trim();
  if (!text && !event.attachments?.length) return;
  if (isStopText(text)) {
    clearSession(event);
    return sendMessage(api, event, "✅ bby conversation বন্ধ করা হয়েছে। আবার bby লিখলে চালু হবে।");
  }
  activateSession(event);
  const key = sessionKey(event);
  const name = await getUserName(usersData, event.senderID);
  if (autoTeachUsers.has(key) && event.messageReply?.body && event.messageReply.body !== text) {
    try { await teachSahu(event.messageReply.body, text, event); } catch (error) { console.error("baby auto-teach error:", error.message); }
  }
  try {
    await setTyping(api, event.threadID, true);
    const replies = event.attachments?.length ? await getAttachmentReply(event) : await getChatReplies(text, event, name);
    return await sendReplies(api, event, replies || []);
  } catch (error) {
    return sendMessage(api, event, "❌ Baby API error: " + (error.message || "Unknown error"));
  } finally {
    await setTyping(api, event.threadID, false);
  }
};

module.exports.onChat = async function ({ api, event, usersData, prefix }) {
  if (event.type === "message_reply") return;
  const raw = String(event.body || "").trim();
  if (!raw || (prefix && raw.startsWith(prefix))) return;
  const triggerText = getTriggerText(raw);
  if (triggerText === null) return;
  const text = triggerText;
  if (isStopText(text)) {
    clearSession(event);
    return sendMessage(api, event, "✅ bby conversation বন্ধ করা হয়েছে। আবার bby লিখলে চালু হবে।");
  }
  activateSession(event);
  if (!text && !event.attachments?.length) {
    const name = await getUserName(usersData, event.senderID);
    return sendMessage(api, event, mention(name, event.senderID, ["হুম বলো জানু 🥰", "আমি শুনতেছি 😚", "কি বলবা baby? 💖", "ডাকছো কেন? 😌"][Math.floor(Math.random() * 4)]));
  }
  try {
    await setTyping(api, event.threadID, true);
    const name = await getUserName(usersData, event.senderID);
    const replies = event.attachments?.length ? await getAttachmentReply(event) : await getChatReplies(text, event, name);
    return await sendReplies(api, event, replies || []);
  } catch (error) {
    console.error("baby onChat error:", error);
    return sendMessage(api, event, "❌ Baby API error: " + (error.message || "Unknown error"));
  } finally {
    await setTyping(api, event.threadID, false);
  }
};
