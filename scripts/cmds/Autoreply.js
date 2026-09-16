const responses = {
  "miss you": "আমিও অনেক মিস করবো 🥹👻😘",
  "miss u too": "হুম আমি ও তোমাকে Miss করি... কিন্তু বস জাবেদ বেশি করে 😏💖",
  "kiss de": "কিস দিস না তোর মুখে দূর গন্ধ কয়দিন ধরে দাঁত ব্রাশ করিস নাই🤬",
  "👍": "আমাকে লাইক করো নাকি 🫣🙀",
  "hi": "এত হাই-হ্যালো কর ক্যান প্রিও..!😉🫵",
  "bc": "SAME TO YOU😊",
  "pro": "Khud k0o KYa LeGend SmJhTi Hai 😂",
  "good morning": "GOOD MORNING দাত ব্রাশ করে খেয়ে নেও😚",
  "good night": "Sweet Dream babu… তবে আগে বস জাবেদ কে GN বলে নিও 😏💤",
  "tor ball": "~ এখনো বাল উঠে নাই নাকি তোমার?? 🤖",
  "JABED": " উনি এখন কাজে বিজি আছে কি বলবেন আমাকে বলতে পারেন..!😘",
  "owner": "‎[𝐎𝐖𝐍𝐄𝐑:☞ JABED ☜",
  "admin": "He is JABED তাকে সবাই JABED BRO 🔥 হিসেবে চিনে😘☺️",
  "babi": "এ তো হাছিনা হে মেরে দিলکی দারকান হে মেরি জান হে😍.",
  "chup": "MAT KAR LALA ",
  "assalamualaikum": "Walaikumassalam❤️‍🩹",
  "fork": "Sorry 😐 bby 🤧💔",
  "kiss me": "তুমি পঁচা তোমাকে কিস দিবো না 🤭",
  "thanks": "you're most very very very very welcome 😊🫰",
  "i love you": "মেয়ে হলে আমার বস জাবেদ এর ইনবক্সে এখুনি গুঁতা দিন🫢 না হলে আপনার বান্ধবীকে ম্যানেজ করে দিন😻",
  "love you": "🥹 আমিও তোমাকে অনেক ভালোবাসি জান 🫣 চলো আজকেই কাজী অফিসে যায়",
  "by": "🥹 এত তাড়াতাড়ি চলে যাচ্ছো ,😢 see you later ❤️‍🩹",
  "ami Jabed": "হ্যা বস কেমন আছেন..?☺️",
  "bot er baccha": "Manos ar baccah , মানুষ ..!!🌚⛏️",
  "tor nam ki": "MY NAME IS ─꯭─⃝‌‌Nilu 🫣💖",
  "pic de": "এন থেকে সর দুরে গিয়া মর😒",
  "cudi": "এত চোদা চুদি করস কেনো..!🥱 বস কে ডাকলে এক মিনিটে তোকে খেয়ে দেবে🌝🌚",
  "bal": "রাগ করে না সোনা পাখি 🥰",
  "heda": "এতো রাগ শরীরের জন্য ভালো না 🥰",
  "boda": "ভাই তুই এত হাসিস না..!🌚🤣",
  "kire ki koros": "তোমার কথা ভাবতে ছি জানু 😚",
  "ki koros": "বস JABED এর সাথে প্রেমে ব্যস্ত আছি 😏💘",
  "kire bot": "হ্যাঁ সব কেমন আছেন আপনার ওই খানে উম্মাহ 😘😽🙈",
  "valo aso": "হ্যাঁ রে প্রিও, বস জাবেদ এর দোয়ায় ভালো আছি 😌💞",
  "pagol": "হুম পাগল, কিন্তু তোমারই পাগল 😏😂",
  "breakup": "চিন্তা করিস না… বস জাবেদ তো আছেই তোকে নতুন জান দিয়া দিবে 😎🔥",
  "tui ke": "আমি তোর বস জাবেদ এর Nilu 😏",
  "umm": "এতো Umm কেনো জানু… কিছু বলবা? 😉",
  "hmm": "Hmmm কিসের হুমম জানু 🥵",
  "love": "OMAGO 😀 আয় হায় 😻 আমার মত সুন্দরী বটে প্রেমে পাগল হয়ে গেছে ,🫣 love you too 🔥",
  "uid": "2876641635 FF 🤙 I'D NAME: GAMING°JABED 🥵"
};

module.exports = {
  config: {
    name: "autoreplybot",
    version: "2.0.0",
    role: 0,
    author: "JABED",
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
      
