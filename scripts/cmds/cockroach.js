const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const jimp = require("jimp");

const VIP_FILE = path.join(__dirname, "vip.json"); // Same VIP system file

module.exports = {
  config: {
    name: "cockroach",
    version: "1.1.0",
    author: "Arafat + VIP Lock by Kakashi",
    countDown: 5,
    role: 0,
    shortDescription: "Expose someone as a cockroach! (VIP only)",
    longDescription: "Puts the tagged/replied user's face on a cockroach's body, VIP users only.",
    category: "fun",
    guide: {
      en: "{pn} @mention or reply to cockroach someone"
    }
  },

  langs: {
    en: {
      notVip: "❌ | You are not a VIP user. Type !vip to see how to get VIP access."
    }
  },

  onStart: async function ({ event, message, api }) {
    // Load VIP list
    let vipDB = [];
    if (fs.existsSync(VIP_FILE)) {
      try {
        vipDB = JSON.parse(fs.readFileSync(VIP_FILE));
      } catch {
        vipDB = [];
      }
    }

    const senderID = event.senderID;
    const isVip = vipDB.some(user => user.uid === senderID && (user.expire === 0 || user.expire > Date.now()));

    // Check VIP
    if (!isVip) {
      return message.reply(this.langs.en.notVip);
    }

    // Main cockroach logic
    let targetID = Object.keys(event.mentions)[0];
    if (event.type === "message_reply") {
      targetID = event.messageReply.senderID;
    }

    if (!targetID) {
      return message.reply("❗ কাউকে ট্যাগ কর বা রিপ্লাই দে, যাতে ওরে তেলাপোকা বানানো যায়!");
    }

    if (targetID === event.senderID) {
      return message.reply("❗ নিজেকে তেলাপোকা বানাতে চাস? একটু লজ্জা কর ভাই! 😹");
    }

    const baseFolder = path.join(__dirname, "Arafat_Temp");
    const bgPath = path.join(baseFolder, "cockroach.png");
    const avatarPath = path.join(baseFolder, `avatar_${targetID}.png`);
    const outputPath = path.join(baseFolder, `cockroach_result_${targetID}.png`);

    try {
      if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);

      // Download cockroach image if missing
      if (!fs.existsSync(bgPath)) {
        const imgUrl = "https://raw.githubusercontent.com/Arafat-Core/Arafat-Temp/main/cockroach.png";
        const res = await axios.get(imgUrl, { responseType: "arraybuffer" });
        await fs.writeFile(bgPath, res.data);
      }

      // Download avatar
      const avatarBuffer = (
        await axios.get(
          `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
          { responseType: "arraybuffer" }
        )
      ).data;
      await fs.writeFile(avatarPath, avatarBuffer);

      const avatarImg = await jimp.read(avatarPath);
      avatarImg.circle();
      await avatarImg.writeAsync(avatarPath);

      const bg = await jimp.read(bgPath);
      bg.resize(600, 800);

      const avatarCircle = await jimp.read(avatarPath);
      avatarCircle.resize(100, 100);

      const xCenter = (bg.getWidth() - avatarCircle.getWidth()) / 2;
      const yTop = 290;

      bg.composite(avatarCircle, xCenter, yTop);

      const finalBuffer = await bg.getBufferAsync("image/png");
      await fs.writeFile(outputPath, finalBuffer);

      const userInfo = await api.getUserInfo(targetID);
      const tagName = userInfo[targetID]?.name || "Someone";

      await message.reply(
        {
          body: `🪳\n${tagName} হলো একটা আসল তেলাপোকা!`,
          mentions: [{ tag: tagName, id: targetID }],
          attachment: fs.createReadStream(outputPath),
        },
        () => {
          try { fs.unlinkSync(avatarPath); } catch (e) {}
          try { fs.unlinkSync(outputPath); } catch (e) {}
        }
      );

    } catch (err) {
      console.error("🐞 Cockroach Command Error:", err);
      message.reply("ওপ্পস! তেলাপোকা পালাইছে বোধহয়... আবার চেষ্টা কর।");
    }
  }
};
