const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

let createCanvas, loadImage;
try {
  const canvas = require("canvas");
  createCanvas = canvas.createCanvas;
  loadImage = canvas.loadImage;
} catch (e) {}

const BEST_FILE = path.join(__dirname, "cache", "best_match.json");
const CACHE_DIR = path.join(__dirname, "cache");

const TEMPLATES = [
  { url: "https://files.catbox.moe/xmsmrt.jpeg", maleSide: "left",  left: { x: 0.22, y: 0.48, size: 0.26 }, right: { x: 0.72, y: 0.48, size: 0.26 } },
  { url: "https://files.catbox.moe/dkbxze.jpeg", maleSide: "left",  left: { x: 0.28, y: 0.28, size: 0.24 }, right: { x: 0.68, y: 0.30, size: 0.24 } },
  { url: "https://files.catbox.moe/c5syq8.jpeg", maleSide: "right", left: { x: 0.25, y: 0.18, size: 0.22 }, right: { x: 0.68, y: 0.16, size: 0.22 } },
  { url: "https://files.catbox.moe/awasn6.jpeg", maleSide: "right", left: { x: 0.28, y: 0.35, size: 0.24 }, right: { x: 0.65, y: 0.38, size: 0.24 } },
  { url: "https://files.catbox.moe/voo30r.jpeg", maleSide: "right", left: { x: 0.22, y: 0.32, size: 0.22 }, right: { x: 0.68, y: 0.30, size: 0.22 } }
];

const RANDOM_GIFS = [
  "https://files.catbox.moe/i9yxez.gif",
  "https://files.catbox.moe/a3r48n.gif",
  "https://files.catbox.moe/6lnz86.gif",
  "https://files.catbox.moe/u3ip3u.gif",
  "https://files.catbox.moe/ydl2aq.gif",
  "https://files.catbox.moe/gp5ulj.gif"
];

const TITLES = [
  "💘 Perfect Match",
  "💞 Soulmates",
  "✨ Destiny Pair",
  "🌌 Cosmic Love",
  "💓 Heart Sync",
  "👑 Ultimate Couple",
  "🔒 Love Locked",
  "🌹 Made For Each Other"
];

function getBadge(p) {
  if (p >= 95) return "🏆 LEGENDARY";
  if (p >= 88) return "💯 PERFECT";
  if (p >= 78) return "🔥 GREAT";
  if (p >= 68) return "😊 GOOD";
  return "🙂 NICE";
}

function getBadgeTier(p) {
  if (p >= 95) return { emoji: "🏆", label: "LEGENDARY", c1: "#FFE066", c2: "#FFA500", glow: "rgba(255,190,60,0.9)" };
  if (p >= 88) return { emoji: "💯", label: "PERFECT",   c1: "#FF9AD5", c2: "#C86DD7", glow: "rgba(255,107,157,0.9)" };
  if (p >= 78) return { emoji: "🔥", label: "GREAT",     c1: "#FF9A5A", c2: "#FF3D3D", glow: "rgba(255,90,60,0.85)" };
  if (p >= 68) return { emoji: "😊", label: "GOOD",      c1: "#6FE3FF", c2: "#4F8CFF", glow: "rgba(80,150,255,0.85)" };
  return          { emoji: "🙂", label: "NICE",      c1: "#B6FFCB", c2: "#43CBFF", glow: "rgba(80,220,180,0.85)" };
}

function makeCaption(percent, title) {
  const list = [
    title + "\n\n💓 দুটো হৃদয় এক ছন্দে বাজছে...\nLove Match: " + percent + "%",
    title + "\n\n🌙✨ চাঁদ আর তারার মতো মানানসই\nChemistry: " + percent + "%",
    title + "\n\n👀 এক নজরেই সব বলে দিলো\nSoul Rate: " + percent + "%",
    title + "\n\n💘 পারফেক্ট ম্যাচ পাওয়া গেছে\nLove: " + percent + "%",
    title + "\n\n🌸 " + percent + "% Pure Connection\nতোমরা একে অপরের জন্যই 💞",
    title + "\n\n🥰 ভালোবাসা কোনো শব্দ নয়...\nMatch: " + percent + "%"
  ];
  return list[Math.floor(Math.random() * list.length)];
}

async function getGender(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    const u = info[uid];
    if (!u) return null;
    if (u.gender === 1 || u.gender === "female") return "female";
    if (u.gender === 2 || u.gender === "male") return "male";
  } catch (e) {}
  return null;
}

async function loadAvatar(uid) {
  if (!loadImage) return null;
  const urls = [
    "https://graph.facebook.com/" + uid + "/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662",
    "https://graph.facebook.com/" + uid + "/picture?type=large&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662",
    "https://graph.facebook.com/" + uid + "/picture?width=512&height=512",
    "https://graph.facebook.com/" + uid + "/picture?type=large"
  ];
  for (const url of urls) {
    try {
      const img = await loadImage(url);
      if (img && img.width >= 80) return img;
    } catch (e) {}
  }
  return null;
}

async function downloadBuffer(url) {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
    if (res.data && res.data.byteLength > 2000) return Buffer.from(res.data);
  } catch (e) {}
  return null;
}

async function createTemplatePair(senderID, targetID, senderName, targetName, senderGender, percent) {
  if (!createCanvas || !loadImage) return null;
  try {
    const tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    const templateImg = await loadImage(tpl.url);
    const width = templateImg.width;
    const height = templateImg.height;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(templateImg, 0, 0, width, height);

    let leftID, rightID, leftName, rightName;
    if (tpl.maleSide === "left") {
      if (senderGender === "male") {
        leftID = senderID; leftName = senderName;
        rightID = targetID; rightName = targetName;
      } else {
        leftID = targetID; leftName = targetName;
        rightID = senderID; rightName = senderName;
      }
    } else {
      if (senderGender === "male") {
        rightID = senderID; rightName = senderName;
        leftID = targetID; leftName = targetName;
      } else {
        rightID = targetID; rightName = targetName;
        leftID = senderID; leftName = senderName;
      }
    }

    const leftAv = await loadAvatar(leftID);
    const rightAv = await loadAvatar(rightID);

    function drawCircleAvatar(img, pos) {
      if (!img) return;
      const size = Math.floor(width * pos.size);
      const x = Math.floor(width * pos.x) - size / 2;
      const y = Math.floor(height * pos.y) - size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, x, y, size, size);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2 + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(4, Math.floor(width * 0.008));
      ctx.stroke();
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawSparkle(cx, cy, r, color) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.28, cy - r * 0.28);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx + r * 0.28, cy + r * 0.28);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.28, cy + r * 0.28);
      ctx.lineTo(cx - r, cy);
      ctx.lineTo(cx - r * 0.28, cy - r * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const tier = getBadgeTier(percent);

    // Frame glow
    const frameW = Math.max(4, Math.floor(width * 0.006));
    ctx.save();
    ctx.strokeStyle = tier.c2;
    ctx.lineWidth = frameW;
    ctx.shadowColor = tier.glow;
    ctx.shadowBlur = Math.floor(width * 0.015);
    ctx.strokeRect(frameW / 2, frameW / 2, width - frameW, height - frameW);
    ctx.restore();

    // Top ribbon
    const ribbonW = Math.floor(width * 0.5);
    const ribbonH = Math.floor(height * 0.055);
    const ribbonX = (width - ribbonW) / 2;
    const ribbonY = Math.floor(height * 0.025);
    const ribbonGrad = ctx.createLinearGradient(ribbonX, 0, ribbonX + ribbonW, 0);
    ribbonGrad.addColorStop(0, tier.c1);
    ribbonGrad.addColorStop(1, tier.c2);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = ribbonGrad;
    roundRect(ribbonX, ribbonY, ribbonW, ribbonH, ribbonH / 2);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = "#1a1020";
    ctx.font = "bold " + Math.floor(ribbonH * 0.5) + "px Arial";
    ctx.fillText("💘 LOVE MATCH 💘", width / 2, ribbonY + ribbonH * 0.66);

    // Sparkles
    drawSparkle(width * 0.08, height * 0.06, width * 0.012, "#FFFFFF");
    drawSparkle(width * 0.92, height * 0.06, width * 0.012, "#FFFFFF");
    drawSparkle(width * 0.06, height * 0.10, width * 0.008, tier.c1);
    drawSparkle(width * 0.94, height * 0.10, width * 0.008, tier.c1);

    drawCircleAvatar(leftAv, tpl.left);
    drawCircleAvatar(rightAv, tpl.right);

    // Bottom caption box
    const boxH = Math.floor(height * 0.20);
    const boxY = height - boxH;
    const radius = Math.floor(height * 0.02);

    const bgGrad = ctx.createLinearGradient(0, boxY, 0, height);
    bgGrad.addColorStop(0, "rgba(20,10,25,0.25)");
    bgGrad.addColorStop(0.3, "rgba(15,8,20,0.75)");
    bgGrad.addColorStop(1, "rgba(8,4,12,0.92)");
    ctx.fillStyle = bgGrad;
    roundRect(0, boxY, width, boxH, radius);
    ctx.fill();

    const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
    lineGrad.addColorStop(0, tier.c2);
    lineGrad.addColorStop(0.5, tier.c1);
    lineGrad.addColorStop(1, tier.c2);
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, boxY, width, Math.max(3, Math.floor(height * 0.007)));

    ctx.textAlign = "center";
    ctx.font = "bold " + Math.floor(height * 0.034) + "px Arial";
    ctx.shadowColor = "rgba(255,107,157,0.85)";
    ctx.shadowBlur = Math.floor(height * 0.01);
    ctx.fillStyle = "#FFFFFF";
    const nameLine = (leftName || "User").substring(0, 13) + "   💗   " + (rightName || "User").substring(0, 13);
    ctx.fillText(nameLine, width / 2, boxY + boxH * 0.30);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Percentage pill
    const pillW = Math.floor(width * 0.46);
    const pillH = Math.floor(height * 0.075);
    const pillX = (width - pillW) / 2;
    const pillY = boxY + boxH * 0.42;

    ctx.save();
    ctx.shadowColor = tier.glow;
    ctx.shadowBlur = Math.floor(height * 0.02);
    const pillGrad = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
    pillGrad.addColorStop(0, tier.c1);
    pillGrad.addColorStop(1, tier.c2);
    ctx.fillStyle = pillGrad;
    roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#1a1020";
    ctx.font = "bold " + Math.floor(pillH * 0.46) + "px Arial";
    ctx.fillText(tier.emoji + "  " + percent + "%  " + tier.label, width / 2, pillY + pillH * 0.65);

    return canvas.toBuffer("image/png");
  } catch (e) {
    console.error("Template error:", e.message);
    return null;
  }
}

module.exports = {
  config: {
    name: "pair",
    version: "2.0.0",
    author: "EryXenX + Anime Pair",
    countDown: 5,
    role: 0,
    description: {
      en: "Find today's random couple / pair with anime template",
      bn: "আজকের random জুটি খোঁজো (অ্যানিমে টেমপ্লেট সহ)",
      hi: "Aaj ka random pair dhundho",
      tl: "Hanapin ang random na pares ngayon",
      ar: "ابحث عن زوج اليوم العشوائي"
    },
    category: "fun",
    guide: {
      en: "{pn}\n{pn} @mention\n{pn} gif\n{pn} best",
      bn: "{pn}\n{pn} @mention\n{pn} gif\n{pn} best"
    }
  },

  langs: {
    en: {
      noMembers: "❌ | Not enough members in this group!",
      error: "❌ | Failed to generate. Try again.",
      selfPair: "😅 You can't pair with yourself!",
      waiting: "💫 Matching... please wait",
      noBest: "😅 No Best Match yet today.",
      bestTitle: "🏆 Today's Best Match"
    },
    bn: {
      noMembers: "❌ | গ্রুপে যথেষ্ট সদস্য নেই!",
      error: "❌ | তৈরি করতে সমস্যা হয়েছে।",
      selfPair: "😅 নিজের সাথে pair করা যায় না!",
      waiting: "💫 ম্যাচিং হচ্ছে... অপেক্ষা করো",
      noBest: "😅 আজকে এখনো Best Match হয়নি।",
      bestTitle: "🏆 আজকের Best Match"
    },
    hi: {
      noMembers: "❌ | Group mein kaafi members nahi hain!",
      error: "❌ | Banana fail hua.",
      selfPair: "😅 Khud se pair nahi kar sakte!",
      waiting: "💫 Matching... please wait",
      noBest: "😅 Aaj abhi Best Match nahi hua.",
      bestTitle: "🏆 Aaj ka Best Match"
    },
    tl: {
      noMembers: "❌ | Hindi sapat ang mga miyembro sa grupo!",
      error: "❌ | Hindi nagawa.",
      selfPair: "😅 Hindi pwedeng mag-pair sa sarili!",
      waiting: "💫 Matching... please wait",
      noBest: "😅 Wala pang Best Match ngayon.",
      bestTitle: "🏆 Best Match Ngayon"
    },
    ar: {
      noMembers: "❌ | لا يوجد أعضاء كافيون في المجموعة!",
      error: "❌ | فشل الإنشاء.",
      selfPair: "😅 لا يمكنك الاقتران بنفسك!",
      waiting: "💫 جاري المطابقة... انتظر",
      noBest: "😅 لا يوجد أفضل تطابق اليوم بعد.",
      bestTitle: "🏆 أفضل تطابق اليوم"
    }
  },

  onStart: async function ({ event, message, getLang, usersData, api, args }) {
    try {
      const { senderID, threadID, mentions, messageReply, messageID } = event;
      const wantGif = (args[0] || "").toLowerCase() === "gif";

      // Reaction
      try {
        await api.setMessageReaction("😍", messageID, () => {}, true);
      } catch (e) {
        try { await api.setMessageReaction("👍", messageID, () => {}, true); } catch (e2) {}
      }

      // Best match
      if ((args[0] || "").toLowerCase() === "best") {
        const best = await fs.readJson(BEST_FILE).catch(() => null);
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
        if (!best || best.date !== today) {
          return message.reply(getLang("noBest"));
        }
        return message.reply(
          getLang("bestTitle") + "\n\n💞 " + best.senderName + " + " + best.targetName +
          "\n⭐ Score: " + best.percent + "%\n" + best.badge
        );
      }

      let waiting = null;
      try {
        waiting = await message.reply(getLang("waiting"));
      } catch (e) {}

      let targetID = null;
      if (messageReply && messageReply.senderID) targetID = messageReply.senderID;
      else if (mentions && Object.keys(mentions).length) targetID = Object.keys(mentions)[0];

      if (targetID === senderID) {
        if (waiting) try { await api.unsendMessage(waiting.messageID); } catch (e) {}
        return message.reply(getLang("selfPair"));
      }

      // Random opposite gender preference
      if (!targetID) {
        const thread = await api.getThreadInfo(threadID);
        const members = (thread.participantIDs || []).filter(id => id != senderID && id != api.getCurrentUserID());
        if (!members.length) {
          if (waiting) try { await api.unsendMessage(waiting.messageID); } catch (e) {}
          return message.reply(getLang("noMembers"));
        }

        const sg = await getGender(senderID, api);
        const opposite = [];
        const others = [];
        for (let i = 0; i < members.length; i++) {
          const g = await getGender(members[i], api);
          if ((sg === "male" && g === "female") || (sg === "female" && g === "male")) {
            opposite.push(members[i]);
          } else {
            others.push(members[i]);
          }
        }
        const list = opposite.length > 0 ? opposite : others;
        targetID = list[Math.floor(Math.random() * list.length)];
      }

      let senderName = "You";
      let targetName = "Partner";

      try {
        const info = await api.getUserInfo([senderID, targetID]);
        if (info[senderID]?.name) senderName = info[senderID].name;
        if (info[targetID]?.name) targetName = info[targetID].name;
      } catch (e) {}

      try {
        const n1 = await usersData.getName(senderID);
        if (n1) senderName = n1;
        const n2 = await usersData.getName(targetID);
        if (n2) targetName = n2;
      } catch (e) {}

      const senderGender = (await getGender(senderID, api)) || "male";
      const percent = Math.floor(Math.random() * 36) + 65; // 65-100
      const badge = getBadge(percent);
      const title = TITLES[Math.floor(Math.random() * TITLES.length)];
      const caption = makeCaption(percent, title);

      // Update daily best
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
      const prev = await fs.readJson(BEST_FILE).catch(() => null);
      if (!prev || prev.date !== today || percent > prev.percent) {
        await fs.ensureDir(path.dirname(BEST_FILE));
        await fs.writeJson(BEST_FILE, {
          date: today,
          senderName,
          targetName,
          percent,
          badge
        });
      }

      // Mentions with fromIndex
      const body = caption + "\n\n👤 " + senderName + "\n💑 " + targetName + "\n" + badge;

      const senderIdx = body.indexOf(senderName);
      const targetIdx = body.indexOf(targetName, senderIdx + senderName.length);

      const msgMentions = [];
      if (senderIdx !== -1) {
        msgMentions.push({ tag: senderName, id: senderID, fromIndex: senderIdx });
      }
      if (targetIdx !== -1) {
        msgMentions.push({ tag: targetName, id: targetID, fromIndex: targetIdx });
      }
      if (msgMentions.length < 2) {
        msgMentions.length = 0;
        msgMentions.push({ tag: senderName, id: senderID });
        msgMentions.push({ tag: targetName, id: targetID });
      }

      if (waiting) {
        try { await api.unsendMessage(waiting.messageID); } catch (e) {}
      }

      await fs.ensureDir(CACHE_DIR);

      let buffer = null;
      let ext = "png";

      if (wantGif) {
        const gifUrl = RANDOM_GIFS[Math.floor(Math.random() * RANDOM_GIFS.length)];
        buffer = await downloadBuffer(gifUrl);
        ext = "gif";
      } else {
        buffer = await createTemplatePair(senderID, targetID, senderName, targetName, senderGender, percent);
        if (!buffer) {
          const gifUrl = RANDOM_GIFS[Math.floor(Math.random() * RANDOM_GIFS.length)];
          buffer = await downloadBuffer(gifUrl);
          ext = "gif";
        }
      }

      const msgData = {
        body,
        mentions: msgMentions
      };

      if (buffer) {
        const file = path.join(CACHE_DIR, "pair_" + Date.now() + "." + ext);
        await fs.writeFile(file, buffer);
        msgData.attachment = fs.createReadStream(file);
        try {
          await message.reply(msgData);
          try { await fs.unlink(file); } catch (e) {}
          return;
        } catch (e) {
          console.error("Upload failed:", e.message);
        }
      }

      return message.reply(msgData);

    } catch (err) {
      console.error("Pair Error:", err);
      return message.reply(getLang("error"));
    }
  }
};
