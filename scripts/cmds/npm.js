const { exec } = require("child_process");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "npm",
    version: "1.0.0",
    role: 2, // শুধু Owner / Admin ব্যবহার করতে পারবে
    author: "Custom",
    shortDescription: {
      en: "Run npm install commands from bot"
    },
    longDescription: {
      en: "Install any npm package using bot command"
    },
    category: "owner",
    guide: {
      en: "{pn} install <package-name>\n{pn} install <package1> <package2>\n{pn} list\n{pn} uninstall <package>"
    }
  },

  onStart: async function ({ message, args, event }) {
    if (!args[0]) {
      return message.reply(
        "📦 npm Command Usage:\n\n" +
        "• .npm install <package>\n" +
        "• .npm install canvas gifencoder\n" +
        "• .npm uninstall <package>\n" +
        "• .npm list"
      );
    }

    const action = args[0].toLowerCase();

    // ========== LIST ==========
    if (action === "list" || action === "ls") {
      return message.reply("⏳ Checking installed packages...", async (err, info) => {
        exec("npm list --depth=0", { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
          const result = stdout || stderr || error?.message || "No output";
          message.reply("📦 Installed Packages:\n\n" + result.slice(0, 15000));
        });
      });
    }

    // ========== INSTALL ==========
    if (action === "install" || action === "i" || action === "add") {
      const packages = args.slice(1);

      if (packages.length === 0) {
        return message.reply("❌ কোনো প্যাকেজের নাম দাও!\nউদাহরণ: .npm install canvas");
      }

      // সিকিউরিটি: শুধু প্যাকেজ নাম allow করবে
      const safePackages = packages.filter(pkg => /^[@a-zA-Z0-9\-_\/\.]+$/.test(pkg));

      if (safePackages.length === 0) {
        return message.reply("❌ অবৈধ প্যাকেজ নাম!");
      }

      const cmd = `npm install ${safePackages.join(" ")} --force`;

      message.reply(`⏳ Installing: ${safePackages.join(", ")}\nঅপেক্ষা করো...`, async (err, info) => {
        exec(cmd, { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 15 }, (error, stdout, stderr) => {
          let result = "";

          if (error) {
            result += `❌ Error:\n${error.message}\n\n`;
          }
          if (stdout) result += `✅ Output:\n${stdout}\n`;
          if (stderr) result += `⚠ stderr:\n${stderr}`;

          // খুব বড় হলে কেটে দিবে
          if (result.length > 15000) {
            result = result.slice(0, 15000) + "\n\n... (output truncated)";
          }

          message.reply(result || "✅ Command executed (no output)");
        });
      });

      return;
    }

    // ========== UNINSTALL ==========
    if (action === "uninstall" || action === "remove" || action === "rm") {
      const packages = args.slice(1);

      if (packages.length === 0) {
        return message.reply("❌ কোনো প্যাকেজের নাম দাও!\nউদাহরণ: .npm uninstall canvas");
      }

      const safePackages = packages.filter(pkg => /^[@a-zA-Z0-9\-_\/\.]+$/.test(pkg));

      if (safePackages.length === 0) {
        return message.reply("❌ অবৈধ প্যাকেজ নাম!");
      }

      const cmd = `npm uninstall ${safePackages.join(" ")}`;

      message.reply(`⏳ Uninstalling: ${safePackages.join(", ")}...`, () => {
        exec(cmd, { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
          let result = stdout || stderr || error?.message || "Done";
          if (result.length > 12000) result = result.slice(0, 12000) + "\n...(truncated)";
          message.reply(result);
        });
      });

      return;
    }

    return message.reply("❌ ভুল কমান্ড!\nশুধু ব্যবহার করো: install / uninstall / list");
  }
};

