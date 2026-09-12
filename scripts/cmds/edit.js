const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs-extra");
const path = require("path");

/* ═══════════ API ROTATION COUNTER ═══════════ */
let apiIndex = 0;

module.exports = {
  config: {
    name: "edit",
    aliases: ["imgedit", "aiedit"],
    version: "3.1.0",
    author: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰 (Fixed by AI)",
    countDown: 25,
    role: 0,
    shortDescription: "Edit image with AI (Rotating APIs)",
    longDescription: "Reply to any image with a prompt to edit it using AI. Rotates between 4 APIs.",
    category: "image",
    guide: "{pn} [prompt]  |  Reply to an image"
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const { senderID, messageReply, threadID, messageID } = event;

    /* ═══════════ VIP & PERMISSION CHECK ═══════════ */
    const ADMINS = global.GoatBot?.config?.adminBot || [];
    const isBotAdmin = ADMINS.map(String).includes(String(senderID));

    if (!isBotAdmin) {
      try {
        const userData = await usersData.get(senderID);
        const vip = userData?.data?.vip;

        if (!vip || !vip.expires || vip.expires < Date.now()) {
          return api.sendMessage(
            "❌ 𝐕𝐈𝐏 𝐎𝐍𝐋𝐘 𝐂𝐎𝐌𝐌𝐀𝐍𝐃\n" +
            "• 𝐎𝐧𝐥𝐲 𝐕𝐈𝐏 𝐮𝐬𝐞𝐫𝐬 𝐜𝐚𝐧 𝐮𝐬𝐞 𝐞𝐝𝐢𝐭\n" +
            "• 𝐓𝐲𝐩𝐞: vip buy",
            threadID,
            messageID
          );
        }
      } catch (err) {
        console.error("[edit] VIP check failed:", err.message);
      }
    }

    /* ═══════════ REACTION HELPER ═══════════ */
    const react = (emoji) => {
      try {
        api.setMessageReaction(emoji, messageID, () => {}, true);
      } catch (e) {}
    };

    /* ═══════════ GET IMAGE URL ═══════════ */
    let imageUrl = null;

    if (messageReply?.attachments?.length > 0) {
      const att = messageReply.attachments.find(
        item => item.type === "photo" || item.type === "image"
      );
      if (att) imageUrl = att.url || att.image_data?.url;
    }

    if (!imageUrl && event.attachments?.length > 0) {
      const att = event.attachments.find(
        item => item.type === "photo" || item.type === "image"
      );
      if (att) imageUrl = att.url || att.image_data?.url;
    }

    if (!imageUrl) {
      react("🖼️");
      return api.sendMessage(
        "❌ একটি ছবির মেসেজে reply করে command দিন।\n\n" +
        "উদাহরণ:\n.edit make the background beautiful",
        threadID,
        messageID
      );
    }

    /* ═══════════ GET PROMPT ═══════════ */
    const prompt = args.join(" ").trim();

    if (!prompt) {
      react("⚠️");
      return api.sendMessage(
        "❌ Prompt দিন।\n\n" +
        "উদাহরণ:\n.edit make the sky sunset",
        threadID,
        messageID
      );
    }

    /* ═══════════ START PROCESSING ═══════════ */
    react("⏳");

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const inputPath = path.join(cacheDir, `edit_in_${Date.now()}.jpg`);
    const outputPath = path.join(cacheDir, `edit_out_${Date.now()}_${senderID}.png`);

    /* ═══════════ SEND WAITING MESSAGE ═══════════ */
    let waitMsgID = null;
    try {
      const waitMsg = await api.sendMessage(
        "🪒please wait bara...",
        threadID,
        messageID
      );
      waitMsgID = waitMsg?.messageID;
    } catch (e) {}

    try {
      /* ═══════════ API LIST (Rotation) ═══════════ */
      const apiFunctions = [
        // ════ API 1: Oculux Flux Kontext (Stream) ════
        async () => {
          const url = `https://dev.oculux.xyz/api/fluxkontext?prompt=${encodeURIComponent(prompt)}&ref=${encodeURIComponent(imageUrl)}`;
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 20000,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (!response.data || response.data.byteLength < 1000) {
            throw new Error("Invalid image data from Oculux");
          }
          await fs.writeFile(outputPath, Buffer.from(response.data));
        },

        // ════ API 2: Xrahat NanoBanana Edit (Multipart) 🍌 ════
        async () => {
          // Download input image
          const imgRes = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          await fs.writeFile(inputPath, Buffer.from(imgRes.data));

          // Build form data (Xrahat format)
          const form = new FormData();
          form.append("image", fs.createReadStream(inputPath), {
            filename: "image.jpg",
            contentType: "image/jpeg"
          });
          form.append("prompt", prompt);
          form.append("resolution", "2K");
          form.append("ratio", "match_input_image");

          // POST to Xrahat API
          const apiResponse = await axios.post(
            "https://xrahat-image-edit.vercel.app/api/edit",
            form,
            {
              headers: { ...form.getHeaders() },
              timeout: 20000,
              maxContentLength: Infinity,
              maxBodyLength: Infinity
            }
          );

          const data = apiResponse.data || {};
          if (!data.success || !data.imageUrl) {
            throw new Error(data.error || "Xrahat edit failed");
          }

          // Download generated image
          const outRes = await axios.get(data.imageUrl, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (!outRes.data || outRes.data.byteLength < 1000) {
            throw new Error("Invalid image from Xrahat");
          }
          await fs.writeFile(outputPath, Buffer.from(outRes.data));
        },

        // ════ API 3: FluxCDI Seedream V4 Edit (JSON) ════
        async () => {
          const url = `https://fluxcdibai-1.onrender.com/generate?prompt=${encodeURIComponent(prompt)}&model=seedream v4 edit&imageUrl=${encodeURIComponent(imageUrl)}`;
          const response = await axios.get(url, {
            timeout: 20000,
            headers: { "User-Agent": "Mozilla/5.0" }
          });

          const resultUrl =
            response.data?.data?.imageResponseVo?.url ||
            response.data?.imageUrl ||
            response.data?.url ||
            response.data?.result;

          if (!resultUrl) throw new Error("No image URL from FluxCDI");

          const imgRes = await axios.get(resultUrl, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (!imgRes.data || imgRes.data.byteLength < 1000) {
            throw new Error("Invalid image from FluxCDI");
          }
          await fs.writeFile(outputPath, Buffer.from(imgRes.data));
        },

        // ════ API 4: Azadx Editor (Stream) ════
        async () => {
          const url = `https://azadx69x.is-a.dev/api/editor?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 20000,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (!response.data || response.data.byteLength < 1000) {
            throw new Error("Invalid image from Azadx");
          }
          await fs.writeFile(outputPath, Buffer.from(response.data));
        }
      ];

      /* ═══════════ ROTATION LOGIC ═══════════ */
      const totalAPIs = apiFunctions.length;
      const currentAPI = apiIndex % totalAPIs;
      apiIndex = (apiIndex + 1) % totalAPIs;

      console.log(`[edit] 🎯 Using API #${currentAPI + 1} of ${totalAPIs}`);

      let success = false;
      let lastError = null;
      let usedAPIName = "";

      const apiNames = ["Oculux", "Xrahat 🍌", "FluxCDI", "Azadx"];

      // Try current API first
      try {
        await apiFunctions[currentAPI]();
        success = true;
        usedAPIName = apiNames[currentAPI];
        console.log(`[edit] ✅ Success with API #${currentAPI + 1} (${usedAPIName})`);
      } catch (err) {
        lastError = err;
        console.log(`[edit] ❌ API #${currentAPI + 1} (${apiNames[currentAPI]}) failed: ${err.message}`);

        // If failed, try backup APIs
        for (let i = 1; i < totalAPIs; i++) {
          const backupIndex = (currentAPI + i) % totalAPIs;
          try {
            console.log(`[edit] 🔄 Trying backup API #${backupIndex + 1} (${apiNames[backupIndex]})...`);
            await apiFunctions[backupIndex]();
            success = true;
            usedAPIName = apiNames[backupIndex];
            apiIndex = (backupIndex + 1) % totalAPIs;
            console.log(`[edit] ✅ Success with backup API #${backupIndex + 1} (${usedAPIName})`);
            break;
          } catch (backupErr) {
            lastError = backupErr;
            console.log(`[edit] ❌ Backup API #${backupIndex + 1} failed: ${backupErr.message}`);
            continue;
          }
        }
      }

      if (!success) {
        throw lastError || new Error("All API endpoints failed");
      }

      /* ═══════════ FILE VALIDATION ═══════════ */
      const stats = await fs.stat(outputPath);
      if (stats.size < 1000) {
        throw new Error("Generated image file is invalid");
      }

      /* ═══════════ DELETE WAITING MESSAGE ═══════════ */
      if (waitMsgID) {
        try { await api.unsendMessage(waitMsgID); } catch (e) {}
      }

      /* ═══════════ SEND SUCCESS ═══════════ */
      react("✅");

      return api.sendMessage(
        {
          body:
            `✅ Image Edit Complete!\n` +
            `📝 Prompt: ${prompt}\n` +
            `🎯 API: ${usedAPIName}`,
          attachment: fs.createReadStream(outputPath)
        },
        threadID,
        () => {
          if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch (e) {}
          }
          if (fs.existsSync(inputPath)) {
            try { fs.unlinkSync(inputPath); } catch (e) {}
          }
        },
        messageReply?.messageID || messageID
      );

    } catch (error) {
      /* ═══════════ ERROR HANDLING ═══════════ */
      console.error("[edit] Final Error:", error.message);

      // Delete waiting message
      if (waitMsgID) {
        try { await api.unsendMessage(waitMsgID); } catch (e) {}
      }

      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (e) {}
      }
      if (fs.existsSync(inputPath)) {
        try { fs.unlinkSync(inputPath); } catch (e) {}
      }

      react("❌");

      let errorMsg = "❌ Image edit failed.";

      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        errorMsg += "\n\n⏱️ Request timed out. Please try again.";
      } else if (error.response?.data?.error) {
        errorMsg += `\n\n${error.response.data.error}`;
      } else if (error.response) {
        errorMsg += `\n\n🌐 API Error: ${error.response.status}`;
      } else if (error.message.includes("too small") || error.message.includes("Invalid")) {
        errorMsg += "\n\n📦 Received invalid image data.";
      } else if (error.message.includes("All API endpoints failed")) {
        errorMsg += "\n\n🔌 All servers are down. Please try again later.";
      } else if (error.message) {
        errorMsg += `\n\n${error.message}`;
      }

      return api.sendMessage(errorMsg, threadID, messageID);
    }
  }
};
