const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");

const API_BASE = "https://xrahat-gen.vercel.app";
const GENERATE_ENDPOINT = `${API_BASE}/api/generate`;

module.exports = {
  config: {
    name: "gen",
    version: "1.0.0",
    author: "🔰𝐑𝐀𝐇𝐀𝐓 𝐈𝐒𝐋𝐀𝐌🔰",
    countDown: 10,
    role: 0,

    shortDescription: {
      en: "AI video generator"
    },

    longDescription: {
      en: "Reply to an image and generate an AI video using a prompt"
    },

    category: "AI",

    guide: {
      en: "{pn} <prompt>\nReply to an image before using the command."
    }
  },

  onStart: async function ({ api, event, args }) {
    const {
      threadID,
      messageID,
      messageReply
    } = event;

    // =========================
    // Check replied message
    // =========================

    if (
      !messageReply ||
      !Array.isArray(messageReply.attachments) ||
      messageReply.attachments.length === 0
    ) {
      return api.sendMessage(
        "⚠️ একটি ছবিতে reply করে command দিন।\n\n" +
        "Example:\n" +
        "!gen dancing in a neon city",
        threadID,
        messageID
      );
    }

    // =========================
    // Find image attachment
    // =========================

    const attachment = messageReply.attachments.find(
      (a) =>
        a.type === "photo" ||
        a.type === "image" ||
        a.type === "sticker" ||
        a.type === "animated_image"
    );

    if (
      !attachment ||
      !(
        attachment.url ||
        attachment.previewUrl ||
        attachment.largePreviewUrl
      )
    ) {
      return api.sendMessage(
        "⚠️ Reply করা মেসেজে কোনো valid image পাওয়া যায়নি।",
        threadID,
        messageID
      );
    }

    // =========================
    // Get prompt
    // =========================

    const prompt = (args || [])
      .join(" ")
      .trim();

    if (!prompt) {
      return api.sendMessage(
        "⚠️ Prompt লিখুন।\n\n" +
        "Example:\n" +
        "!gen dancing in a neon city",
        threadID,
        messageID
      );
    }

    const imageUrl =
      attachment.url ||
      attachment.previewUrl ||
      attachment.largePreviewUrl;

    let waitMessageID = null;
    let tempFilePath = null;

    try {
      // =========================
      // Wait message
      // =========================

      waitMessageID = await new Promise((resolve) => {
        api.sendMessage(
          "🪒 Please wait bara...",
          threadID,
          (err, info) => {
            resolve(
              info ? info.messageID : null
            );
          },
          messageID
        );
      });

      // =========================
      // Download image
      // =========================

      const imageResponse = await axios.get(
        imageUrl,
        {
          responseType: "arraybuffer",
          timeout: 670000
        }
      );

      const imageBuffer = Buffer.from(
        imageResponse.data
      );

      // =========================
      // Create FormData
      // =========================

      const form = new FormData();

      form.append(
        "image",
        imageBuffer,
        {
          filename: "input.jpg",
          contentType: "image/jpeg"
        }
      );

      form.append("prompt", prompt);
      form.append("mode", "image");

      // =========================
      // Generate video
      // =========================

      const genResponse = await axios.post(
        GENERATE_ENDPOINT,
        form,
        {
          headers: {
            ...form.getHeaders()
          },

          maxBodyLength: Infinity,
          maxContentLength: Infinity,

          timeout: 2780000,

          responseType: "arraybuffer",

          validateStatus: () => true
        }
      );

      const contentType =
        genResponse.headers[
          "content-type"
        ] || "";

      // =========================
      // API JSON error
      // =========================

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        let errorJson = null;

        try {
          errorJson = JSON.parse(
            Buffer.from(
              genResponse.data
            ).toString("utf-8")
          );
        } catch (_) {}

        throw new Error(
          (errorJson &&
            (
              errorJson.Result ||
              errorJson.error ||
              errorJson.message
            )) ||
            "Generation failed"
        );
      }

      // =========================
      // Validate video response
      // =========================

      if (
        genResponse.status < 200 ||
        genResponse.status >= 300
      ) {
        throw new Error(
          `API returned status ${genResponse.status}`
        );
      }

      if (
        !contentType.startsWith("video/")
      ) {
        throw new Error(
          "Unexpected response from generate API"
        );
      }

      // =========================
      // Get extension
      // =========================

      const ext =
        (
          contentType
            .split("/")[1] ||
          "mp4"
        )
          .split(";")[0]
          .trim();

      // =========================
      // Save video temporarily
      // =========================

      const videoBuffer = Buffer.from(
        genResponse.data
      );

      tempFilePath = path.join(
        os.tmpdir(),
        `gen_${Date.now()}_${Math.floor(
          Math.random() * 1000000
        )}.${ext}`
      );

      await fs.writeFile(
        tempFilePath,
        videoBuffer
      );

      // =========================
      // Send video
      // =========================

      await new Promise(
        (resolve, reject) => {
          api.sendMessage(
            {
              body:
                "✅ আপনার ভিডিও তৈরি হয়েছে!\n\n" +
                `📝 Prompt: ${prompt}`,

              attachment:
                fs.createReadStream(
                  tempFilePath
                )
            },

            threadID,

            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            },

            messageID
          );
        }
      );

      // =========================
      // Remove wait message
      // =========================

      if (waitMessageID) {
        try {
          api.unsendMessage(
            waitMessageID
          );
        } catch (_) {}
      }

    } catch (error) {
      console.error(
        "[gen.js] error:",
        error?.response?.data ||
          error?.message ||
          error
      );

      // Remove wait message
      if (waitMessageID) {
        try {
          api.unsendMessage(
            waitMessageID
          );
        } catch (_) {}
      }

      return api.sendMessage(
        "❌ ভিডিও তৈরি করা যায়নি।\n" +
        "আবার চেষ্টা করুন।",
        threadID,
        messageID
      );

    } finally {
      // =========================
      // Cleanup temporary file
      // =========================

      if (tempFilePath) {
        fs.unlink(
          tempFilePath,
          () => {}
        );
      }
    }
  }
};
