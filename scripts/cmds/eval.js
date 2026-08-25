const { removeHomeDir, log } = global.utils;

module.exports = {
  config: {
    name: "eval",
    version: "1.8",
    author: "NTKhang",
    countDown: 2,
    role: 4, // শুধুমাত্র বটের প্রধান ওনার ব্যবহার করতে পারবেন
    description: {
      vi: "Test code nhanh",
      en: "Test code quickly"
    },
    category: "owner",
    guide: {
      vi: "{pn} <đoạn code cần test>",
      en: "{pn} <code to test>"
    }
  },

  langs: {
    vi: {
      error: "✗ Đã có lỗi xảy ra:"
    },
    en: {
      error: "✗ An error occurred:"
    }
  },

  onStart: async function ({ api, args, message, event, threadsData, usersData, dashBoardData, globalData, threadModel, userModel, dashBoardModel, globalModel, role, commandName, getLang }) {
    const { threadID, messageID } = event;

    // চ্যাটে আউটপুট দেখানোর জন্য কাস্টম ফাংশন
    function output(msg) {
      if (typeof msg == "number" || typeof msg == "boolean" || typeof msg == "function")
        msg = msg.toString();
      else if (msg instanceof Map) {
        let text = `Map(${msg.size}) `;
        text += JSON.stringify(mapToObj(msg), null, 2);
        msg = text;
      }
      else if (typeof msg == "object")
        msg = JSON.stringify(msg, null, 2);
      else if (typeof msg == "undefined")
        msg = "undefined";

      api.sendMessage(msg, threadID, messageID);
    }

    function out(msg) {
      output(msg);
    }

    function mapToObj(map) {
      const obj = {};
      map.forEach(function (v, k) {
        obj[k] = v;
      });
      return obj;
    }

    // কোড এক্সিকিউশন ইঞ্জিন
    try {
      const code = args.join(" ");
      if (!code) return api.sendMessage("❌ দয়া করে রান করার জন্য কোনো কোড লিখুন।", threadID, messageID);
      
      // ইভাল ফাংশন রান করা
      let evalResult = await eval(`(async () => { ${code} })()`);
      
      // যদি কোড থেকে সরাসরি কোনো রিটার্ন আসে, তবে তা চ্যাটে দেখাবে
      if (evalResult !== undefined) {
        output(evalResult);
      }
    } catch (err) {
      log.err("eval command", err);
      const errMessage = err.stack ? removeHomeDir(err.stack) : removeHomeDir(JSON.stringify(err, null, 2) || "");
      api.sendMessage(`${getLang("error")}\n${errMessage}`, threadID, messageID);
    }
  }
};

