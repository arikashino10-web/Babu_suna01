module.exports = {
  config: {
    name: "gone",
    version: "1.0.0",
    role: 0,
    author: "SHAHADAT SAHU",
    longDescription: "Inform user leaving",
    category: "group",
    guide: { en: "{pn}" }
  },
  onStart: async function ({ api, event }) {
    return api.sendMessage("Goodbye!", event.threadID, event.messageID);
  }
};
