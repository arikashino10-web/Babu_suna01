const responses = {
  "miss you": "অরেক বেডারে Miss না করে xan মেয়ে হলে বস সাহু রে হাঙ্গা করো😶👻😘",
  "miss u too": "হুম আমি ও তোমাকে Miss করি... কিন্তু সাহু বস বেশি করে 😏💖",
  "kiss de": "কিস দিস না তোর মুখে দূর গন্ধ কয়দিন ধরে দাঁত ব্রাশ করিস নাই🤬",
  "👍": "সর এখান থেকে লাইকার আবাল..!🐸🤣👍⛏️",
  "hi": "এত হাই-হ্যালো কর ক্যান প্রিও..!😜🫵",
  "bc": "SAME TO YOU😊",
  "pro": "Khud k0o KYa LeGend SmJhTi Hai 😂",
  "good morning": "GOOD MORNING দাত ব্রাশ করে খেয়ে নেও😚",
  "good night": "Sweet Dream babu… তবে আগে সাহু বস কে GN বলে নিও 😏💤",
  "tor ball": "~ এখনো বাল উঠে নাই নাকি তোমার?? 🤖",
  "shahadat": " উনি এখন কাজে বিজি আছে কি বলবেন আমাকে বলতে পারেন..!😘",
  "owner": "‎[𝐎𝐖𝐍𝐄𝐑:☞ JABED ☜",
  "admin": "He is SHAHADAT SAHU তাকে সবাই Admin SAHU হিসেবে চিনে😘☺️",
  "babi": "এ তো হাছিনা হে মেরে দিলکی দারকান হে মেরি জান হে😍.",
  "chup": "तूइ चुप चुप कर पागल छागल",
  "assalamualaikum": "Walaikumassalam❤️‍🩹",
  "fork": "Sorry 😐 bby 🤧💔",
  "kiss me": "তুমি পঁচা তোমাকে কিস দিবো না 🤭",
  "thanks": "এতো ধন্যবাদ না দিয়ে আমার বস সাহু রে তোর گار্লফ্রেন্ড টা দিয়ে দে..!🐸🥵",
  "i love you": "মেয়ে হলে আমার বস সাহু এর ইনবক্সে এখুনি গুঁতা দিন🫢😻",
  "love you": "ভালোবাসা নামক আবলামী করতে চাইলে Boss সাহু এর ইনবক্সে গুতা দিন 😘",
  "by": "কিরে তুই কই যাস কোন মেয়ের সাথে চিপায় যাবি..!🌚🌶️",
  "ami shahadat": "হ্যা বস কেমন আছেন..?☺️",
  "bot er baccha": "আমার বাচ্চা তো তোমার গার্লফ্রেন্ডের পেটে..!!🌚⛏️",
  "tor nam ki": "MY NAME IS ─꯭─⃝‌‌Layra 🫣💖",
  "pic de": "এন থেকে সর দুরে গিয়া মর😒",
  "cudi": "এত চোদা চুদি করস কেনো..!🥱🌝🌚",
  "bal": "রাগ করে না সোনা পাখি 🥰",
  "heda": "এতো রাগ শরীরের জন্য ভালো না 🥰",
  "boda": "ভাই তুই এত হাসিস না..!🌚🤣",
  "kire ki koros": "তোমার কথা ভাবতে ছি জানু 😚",
  "ki koros": "বস JABED এর সাথে প্রেমে ব্যস্ত আছি 😏💘",
  "kire bot": "হ্যাঁ সব কেমন আছেন আপনার ওই খানে উম্মাহ 😘😽🙈",
  "valo aso": "হ্যাঁ রে প্রিও, বস সাহু এর দোয়ায় ভালো আছি 😌💞",
  "pagol": "হুম পাগল, কিন্তু তোমারই পাগল 😏😂",
  "breakup": "চিন্তা করিস না… সাহু বস তো আছেই তোকে নতুন জন দিয়া দিবে 😎🔥",
  "tui ke": "আমি তোর বস সাহু এর ChatBot 😏",
  "umm": "এতো Umm কেনো জানু… কিছু বলবা? 😉",
  "hmm": "Hmmm কিসের হুমম জানু 🥵",
  "love": "Love করলে সরাসরি সাহু বস কে বল জানু 😻🔥",
  "uid": "2876641635 FF 🤙 I'D NAME: GAMING°JABED 🥵"
};

module.exports = {
  config: {
    name: "autoreplybot",
    version: "2.0.0",
    role: 0,
    author: "SHAHADAT SAHU",
    shortDescription: { en: "Automated chat reply" },
    longDescription: { en: "Automated chatbot reply system" },
    category: "Chat"
  },

  onStart: async function () {},

  onChat: async function ({ message, event }) {
    if (!event.body) return;
    const msg = event.body.toLowerCase().trim();
    if (responses[msg]) return message.reply(responses[msg]);
  }
};
      
