const fs   = require("fs-extra");
const path = require("path");
const axios = require("axios");

const IMG_URL = "https://i.imgur.com/X8dWAWf.jpeg";
const HEAD_X  = 200;
const HEAD_Y  = 213;
const RADIUS  = 35;

module.exports = {
    config: {
        name        : "hbf",
        version     : "2.2.3",
        author      : "Arafat",
        countDown   : 10,
        role        : 0,
        description : "Puts a user's avatar on the HBF",
        category    : "fun",
        guide       : "{pn} @tag | reply"
    },

    onStart: async function ({ api, event, botAdmins, usersData }) {
        const { threadID, messageID, senderID, mentions, type, messageReply } = event;

        let targetID = (type === "message_reply") ? messageReply.senderID :
                       (Object.keys(mentions).length > 0) ? Object.keys(mentions)[0] : senderID;

        // ── Bot Admin Protection System (Absolute Block for Anyone)
        if (botAdmins && botAdmins.includes(String(targetID))) {
            return api.sendMessage(
                "⚠️ | 𝐘𝐨𝐮 𝐜𝐚𝐧'𝐭 𝐮𝐬𝐞 𝐭𝐡𝐢𝐬 𝐜𝐨𝐦𝐦𝐚𝐧𝐝 𝐨𝐧 𝐛𝐨𝐭 𝐚𝐝𝐦𝐢𝐧𝐬.",
                threadID, messageID
            );
        }

        const cachePath = path.join(__dirname, "cache", `hbf_${targetID}.jpg`);

        let sharp;
        try {
            sharp = require("sharp");
        } catch (e) {
            return api.sendMessage(
                "❌ | Required module not installed on this bot.",
                threadID, messageID
            );
        }

        try {
            // ── Step 1: Resolve avatar URL 
            let avatarUrl = null;

            try {
                avatarUrl = await usersData.getAvatarUrl(targetID);
            } catch (e) {
                try {
                    const userInfo = await api.getUserInfo(targetID);
                    const uInfo = userInfo[targetID] || {};
                    avatarUrl = uInfo.profileUrl || uInfo.thumbSrc || null;
                } catch (e2) {
                    console.warn(`[hbf] getUserInfo fallback also failed for ${targetID}:`, e2.message);
                }
            }

            if (!avatarUrl) {
                return api.sendMessage(
                    "❌ | 𝐔𝐧𝐚𝐛𝐥𝐞 𝐭𝐨 𝐫𝐞𝐬𝐨𝐥𝐯𝐞 𝐚𝐯𝐚𝐭𝐚𝐫 𝐔𝐑𝐋 𝐟𝐨𝐫 𝐭𝐡𝐢𝐬 𝐮𝐬𝐞𝐫.",
                    threadID, messageID
                );
            }

            // ── Step 2: Convert avatar URL → Buffer
            let avatarBuffer = null;

            try {
                const stream = await global.utils.getStreamFromURL(avatarUrl);
                if (stream) {
                    avatarBuffer = await streamToBuffer(stream);
                }
            } catch (e) {
                console.warn(`[hbf] getStreamFromURL failed, falling back to axios:`, e.message);
            }

            if (!avatarBuffer) {
                try {
                    avatarBuffer = await fetchBuffer(avatarUrl);
                } catch (e) {
                    console.error(`[hbf] axios avatar fetch also failed:`, e.message);
                }
            }

            if (!avatarBuffer) {
                return api.sendMessage(
                    "❌ | 𝐂𝐨𝐮𝐥𝐝 𝐧𝐨𝐭 𝐥𝐨𝐚𝐝 𝐚𝐯𝐚𝐭𝐚𝐫 𝐢𝐦𝐚𝐠𝐞.",
                    threadID, messageID
                );
            }

            // ── Step 3: Fetch background 
            const bgBuffer = await fetchBuffer(IMG_URL);

            // ── Step 4: Build circular avatar with white border 
            const diameter   = RADIUS * 2;
            const borderR    = RADIUS + 4;
            const borderDiam = borderR * 2;

            const resized = await sharp(avatarBuffer)
                .resize(diameter, diameter, { fit: "cover", position: "centre" })
                .png()
                .toBuffer();

            const mask = Buffer.from(
                `<svg width="${diameter}" height="${diameter}">` +
                    `<circle cx="${RADIUS}" cy="${RADIUS}" r="${RADIUS}" fill="white"/>` +
                `</svg>`
            );

            const circleAvatar = await sharp(resized)
                .composite([{ input: mask, blend: "dest-in" }])
                .png()
                .toBuffer();

            const withBorder = await sharp({
                create: {
                    width: borderDiam, height: borderDiam,
                    channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 },
                },
            })
                .png()
                .composite([
                    {
                        input: Buffer.from(
                            `<svg width="${borderDiam}" height="${borderDiam}">` +
                                `<circle cx="${borderR}" cy="${borderR}" r="${borderR}" fill="white"/>` +
                            `</svg>`
                        ),
                        top: 0, left: 0,
                    },
                    { input: circleAvatar, top: 4, left: 4 },
                ])
                .png()
                .toBuffer();

            // ── Step 5: Composite avatar onto background 
            const top  = Math.round(HEAD_Y - borderR);
            const left = Math.round(HEAD_X - borderR);

            const outputBuffer = await sharp(bgBuffer)
                .composite([{ input: withBorder, top, left }])
                .jpeg({ quality: 90 })
                .toBuffer();

            // ── Step 6: Save & send 
            await fs.ensureDir(path.join(__dirname, "cache"));
            await fs.outputFile(cachePath, outputBuffer);

            return api.sendMessage({
                body: "Funny Effect: HBF Successful <🐸",
                attachment: fs.createReadStream(cachePath)
            }, threadID, () => {
                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
            }, messageID);

        } catch (error) {
            console.error("[hbf] Error:", error);
            return api.sendMessage(
                "❌ | 𝐔𝐧𝐚𝐛𝐥𝐞 𝐭𝐨 𝐠𝐞𝐧𝐞𝐫𝐚𝐭𝐞 𝐞𝐟𝐟𝐞𝐜𝐭.",
                threadID, messageID
            );
        }
    }
};

// ─── Helpers 

async function fetchBuffer(url) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        maxRedirects: 10,
        httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "image/jpeg,image/*,*/*;q=0.8",
        }
    });
    return Buffer.from(res.data);
}

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data",  (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        stream.on("end",   ()  => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
              }
