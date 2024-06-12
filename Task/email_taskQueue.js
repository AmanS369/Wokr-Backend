import User from "../Database/Model/userModel.js";
import Queue from "bull";
import JWT from "jsonwebtoken";
import redisConfig from "./task_config.js";
import { sendInviteMail } from "../helper/sendInvite.js";
import Token from "../Database/token.js";
import generateTokenId from "../helper/uniqueToken.js";

const emailQueue = new Queue("emailQueue", {
  redis: {
    host: process.env.REDIS_URL,
    port: process.env.REDIS_PORT,
  },
});

emailQueue.process(async (job) => {
  const {
    workspace_id,
    emails,
    permission,
    workspaceTitle,
    workspace_admin,
    sender_id,
  } = job.data;
  console.log("this is form the Quue", emails);
  try {
    for (const email of emails) {
      const user = await User.findOne({ email });
      if (user._id == workspace_admin || user._id == sender_id) continue;

      if (user) {
        const tokenIdentifier = generateTokenId();
        const token = JWT.sign(
          { workspace_id, email, permission, jti: tokenIdentifier },
          process.env.SECRET_KEY,
          { expiresIn: "1d" },
        );
        await Token.create({ tokenId: tokenIdentifier });
        await sendInviteMail(workspaceTitle, email, user.name, token);
      } else {
        throw new Error(`User not found for email: ${email}`);
      }
    }
  } catch (error) {
    console.error(`Failed to send invite: ${error.message}`);
    throw error;
  }
});

export default emailQueue;
