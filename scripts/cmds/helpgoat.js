const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "helpgoat",
    aliases: ["gshelp", "dumpcmds"],
    version: "4.1",
    author: "YourName",
    countDown: 15,
    role: 2,
    description: "Collect all command sources and create a paste link",
    category: "system",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message, api, event }) {
    const { commands } = global.GoatBot;

    await message.reply("🔄 Collecting all command sources... Please wait.");

    function findRealPath(cmd) {
      try {
        for (const key of Object.keys(require.cache)) {
          const mod = require.cache[key];
          if (!mod || !mod.exports) continue;
          if (mod.exports === cmd) return key;
          if (
            mod.exports.config &&
            mod.exports.config.name &&
            cmd.config &&
            cmd.config.name &&
            mod.exports.config.name.toLowerCase() === cmd.config.name.toLowerCase()
          ) {
            return key;
          }
        }
      } catch (e) {}
      return null;
    }

    const list = [];
    const seen = new Set();

    for (const [name, cmd] of commands) {
      if (!cmd || !cmd.config || typeof cmd.onStart !== "function") continue;

      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const realPath = findRealPath(cmd);
      if (realPath && fs.existsSync(realPath)) {
        list.push({
          name: name,
          realPath: realPath
        });
      }
    }

    list.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    if (list.length === 0) {
      return message.reply("❌ No command files found on disk.");
    }

    let bigText = "=== ALL COMMAND SOURCES ===\n";
    bigText += "Total files found: " + list.length + "\n";
    bigText += "Generated: " + new Date().toLocaleString() + "\n";
    bigText += "========================================\n\n";

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      try {
        const code = fs.readFileSync(item.realPath, "utf8");
        bigText += "\n\n########## " + item.name + " ##########\n";
        bigText += "Path: " + item.realPath + "\n";
        bigText += "========================================\n";
        bigText += code;
        bigText += "\n########## END " + item.name + " ##########\n";
      } catch (err) {
        bigText += "\n\n########## " + item.name + " ##########\n";
        bigText += "Error reading file: " + err.message + "\n";
      }
    }

    // Try paste.rs
    try {
      const res = await axios.post("https://paste.rs", bigText, {
        headers: {
          "Content-Type": "text/plain"
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000
      });

      const pasteUrl = res.data;
      if (pasteUrl && typeof pasteUrl === "string" && pasteUrl.indexOf("http") === 0) {
        return message.reply(
          "✅ Success!\n\n" +
          "📦 Total commands: " + list.length + "\n" +
          "🔗 Paste Link:\n" + pasteUrl
        );
      }
    } catch (e) {
      console.log("paste.rs failed:", e.message);
    }

    // Fallback: send as file
    try {
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const filePath = path.join(cacheDir, "all_commands_" + Date.now() + ".txt");
      fs.writeFileSync(filePath, bigText, "utf8");

      await message.reply({
        body: "⚠️ Paste service failed.\nSending as file instead.\n\nTotal commands: " + list.length,
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(function () {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {}
      }, 60000);

    } catch (err) {
      return message.reply("❌ Failed: " + err.message);
    }
  }
};
