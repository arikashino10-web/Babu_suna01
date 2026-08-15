module.exports = {
  config: {
    name: "spam",
    version: "1.0.0",
    role: 2, // এডমিন বা নির্দিষ্ট পাওয়ার ইউজারদের জন্য লক করা
    author: "SHAHADAT SAHU",
    shortDescription: { en: "Spam a message multiple times" },
    longDescription: { en: "Send a specific message multiple times in the chat" },
    category: "spam",
    guide: { en: "{pn} [message] [amount]" }
  },

  onStart: async function ({ message, event, args }) {
    // এখানে ইনপুট চেক করার জন্য ২টি আর্গুমেন্ট আলাদা করা হয়েছে
    if (!args || args.length < 2) {
      return message.reply("Invalid syntax. Usage: spam [message] [amount]");
    }

    // শেষ আর্গুমেন্টটিকে সংখ্যা (Amount) ধরা হবে এবং বাকি অংশকে মেসেজ ধরা হবে
    const count = parseInt(args[args.length - 1]);
    const msg = args.slice(0, -1).join(" ");

    if (isNaN(count) || count <= 0) {
      return message.reply("Please provide a valid amount (number greater than 0)");
    }

    if (count > 50) {
      return message.reply("Maximum spam limit is 50 to prevent Facebook account block!");
    }

    // মেসেজগুলো একের পর এক পাঠানোর জন্য লুপ এবং সামান্য টাইমিং গ্যাপ
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        message.reply(msg);
      }, i * 300); // প্রতি মেসেজের মাঝে ৩০০ মিলি-সেকেন্ড বিরতি
    }
  }
};
