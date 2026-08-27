module.exports = {
  config: {
    name: "slot",
    version: "9.0",
    author: "FARHAN-KHAN",
    role: 0,
    category: "game",
    shortDescription: "🎰 Animated Slot (Final Stable)"
  },

  onStart: async function ({ message, event, args, usersData, threadsData, api }) {
    const { senderID, threadID } = event;

    if (!global.slotCooldown) global.slotCooldown = {};
    if (global.slotCooldown[senderID] && Date.now() - global.slotCooldown[senderID] < 3000)
      return message.reply("⏳ | 𝐏𝐥𝐞𝐚𝐬𝐞 𝐖𝐚𝐢𝐭 𝟑 𝐒𝐞𝐜𝐨𝐧𝐝𝐬..!");
    global.slotCooldown[senderID] = Date.now();

    let input = args[0];
    if (!input) return message.reply("❌ | 𝐄𝐧𝐭𝐞𝐫 𝐛𝐞𝐭 𝐚𝐦𝐨𝐮𝐧𝐭..! $");

    let bet = input.toLowerCase().endsWith("k") ? parseFloat(input)*1000 :
              input.toLowerCase().endsWith("m") ? parseFloat(input)*1e6 :
              parseFloat(input);

    if (isNaN(bet) || bet < 300) return message.reply("❌ | 𝐌𝐢𝐧𝐢𝐦𝐮𝐦 𝐛𝐞𝐭 𝐢𝐬 𝟑𝟎𝟎..!💰");
    if (bet > 300000000) return message.reply("❌ | 𝐌𝐚𝐱 𝟑𝟎𝟎𝐌..!💰");

    let user = await usersData.get(senderID);
    if (!user || bet > user.money)
      return message.reply("❌ | 𝐍𝐨𝐭 𝐞𝐧𝐨𝐮𝐠𝐡 𝐦𝐨𝐧𝐞𝐲..!💰");

    let data = await threadsData.get(threadID, "data.slotData") || {};

    if (!data[senderID]) data[senderID] = { spins: 40, lastReset: Date.now() };

    if (Date.now() - data[senderID].lastReset > 3600000)
      data[senderID] = { spins: 40, lastReset: Date.now() };

    if (data[senderID].spins <= 0)
      return message.reply("⏳ | 𝐍𝐨 𝐬𝐩𝐢𝐧𝐬 𝐥𝐞𝐟𝐭..!");

    data[senderID].spins--;

    const icons = ["🍊","🍉","💚","💛","💜","❤️","💎","🍇","🍒"];
    const roll = () => icons[Math.floor(Math.random() * icons.length)];

    let info = await message.reply(`
╔════════════════════╗
    🎰♻️ 𝐒𝐋𝐎𝐓 𝐌𝐀𝐂𝐇𝐈𝐍𝐄 ♻️🎰
╚════════════════════╝

❰ ⏳ ┃ ⏳ ┃ ⏳ ┃ ⏳ ┃ ⏳ ❱

🎰 𝐒𝐩𝐢𝐧𝐧𝐢𝐧𝐠...
━━━━━━━━━━━━━━━━━━
`);

    let msgID = info.messageID;

    for (let i = 0; i < 4; i++) {
      let spinLine = `❰ ${roll()} ┃ ${roll()} ┃ ${roll()} ┃ ${roll()} ┃ ${roll()} ❱`;
      let spinUI = `╔════════════════════╗
    🎰♻️ 𝐒𝐋𝐎𝐓 𝐌𝐀𝐂𝐇𝐈𝐍𝐄 ♻️🎰
╚════════════════════╝

${spinLine}

🎰 𝐒𝐩𝐢𝐧𝐧𝐢𝐧𝐠...
━━━━━━━━━━━━━━━━━━`;
      await new Promise(r => setTimeout(r, 300));
      try { await api.editMessage(spinUI, msgID); } catch(e) {}
    }

    let chance = Math.random();
    let resultType;
    if (chance < 0.08) resultType = "jackpot";
    else if (chance < 0.25) resultType = "big";
    else if (chance < 0.50) resultType = "good";
    else if (chance < 0.70) resultType = "small";
    else if (chance < 0.85) resultType = "near";
    else resultType = "lose";

    let s1 = roll(), s2 = roll(), s3 = roll(), s4 = roll(), s5 = roll();
    if (resultType === "near") { s1 = s2 = roll(); }

    let win = 0, text = "", bonus = "";

    if (resultType === "jackpot") {
      win = bet * (10 + Math.random()*5);
      text = "💎 𝐉𝐀𝐂𝐊𝐏𝐎𝐓 💎";
      bonus = "𝐈𝐍𝐒𝐀𝐍𝐄 𝐖𝐈𝐍!";
    } else if (resultType === "big") {
      win = bet * (5 + Math.random()*2);
      text = "🎉 𝐁𝐈𝐆 𝐖𝐈𝐍 🎉";
      bonus = "𝐇𝐮𝐠𝐞 𝐡𝐢𝐭!";
    } else if (resultType === "good") {
      win = bet * (2 + Math.random());
      text = "🎊 𝐆𝐎𝐎𝐃 𝐖𝐈𝐍 🎊";
      bonus = "𝐍𝐢𝐜𝐞!";
    } else if (resultType === "small") {
      win = bet * (1.2 + Math.random()*0.5);
      text = "✨ 𝐒𝐌𝐀𝐋𝐋 𝐖𝐈𝐍 ✨";
      bonus = "𝐋𝐮𝐜𝐤𝐲!";
    } else if (resultType === "near") {
      win = -bet * 0.2;
      text = "𝐀𝐋𝐌𝐎𝐒𝐓!💐";
      bonus = "𝐒𝐨 𝐜𝐥𝐨𝐬𝐞!";
    } else {
      win = -bet;
      text = "😢 𝐋𝐎𝐒𝐓 😢";
      bonus = "𝐓𝐫𝐲 𝐚𝐠𝐚𝐢𝐧!";
    }

    win = Math.floor(win);
    let newBal = user.money + win;

    await usersData.set(senderID, { money: newBal, data: user.data });
    await threadsData.set(threadID, data, "data.slotData");

    const format = n =>
      n >= 1e6 ? (n/1e6).toFixed(2)+"M" :
      n >= 1e3 ? (n/1e3).toFixed(2)+"K" : n;

    let final = `╔════════════════════╗
    🔰♻️ 𝐒𝐋𝐎𝐓 𝐌𝐀𝐂𝐇𝐈𝐍𝐄 ♻️🔰
╚════════════════════╝

❰ ${s1} ┃ ${s2} ┃ ${s3} ┃ ${s4} ┃ ${s5} ❱

━━━━━━━━━━━━━━━━━━
🎯 𝐑𝐄𝐒𝐔𝐋𝐓: ➤  ${text} 

${win>0?`🟢 𝐖𝐈𝐍: ➤ 『 \[ {format(win)} 』`:`🔴 𝐋𝐎𝐒𝐒: ➤ 『 \]{format(-win)} 』`}

💰 𝐁𝐀𝐋𝐀𝐍𝐂𝐄: ➤ 『 $${format(newBal)} 』

🎲 𝐒𝐏𝐈𝐍𝐒: ➤ 『 ${data[senderID].spins}/40 』

💡『 ${bonus} 』
━━━━━━━━━━━━━━━━━━`;

    if (resultType === "jackpot") await message.reply("💎💎 𝐉𝐀𝐂𝐊𝐏𝐎𝐓 💎💎");

    try {
      await api.editMessage(final, msgID);
    } catch(e) {
      return message.reply(final);
    }
  }
};
