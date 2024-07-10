import User from "../Database/Model/userModel.js";
import Queue from "bull";
import JWT from "jsonwebtoken";
import redisConfig from "./task_config.js";
import { sendAssigneeMail } from "../helper/sendInvite.js";
import Token from "../Database/token.js";
import generateTokenId from "../helper/uniqueToken.js";

// Initialize email queues with Redis configuration
const emailQueue = new Queue("emailQueue", {
  redis: {
    host: process.env.REDIS_URL,
    port: process.env.REDIS_PORT,
  },
});

const assigneeEmailQueue = new Queue("assigneeEmailQueue", {
  redis: {
    host: process.env.REDIS_URL,
    port: process.env.REDIS_PORT,
  },
});

// Process emailQueue
emailQueue.process(async (job) => {
  const {
    workspace_id,
    emails,
    permission,
    workspaceTitle,
    workspace_admin,
    sender_id,
  } = job.data;

  console.log("Processing emailQueue:", emails);

  try {
    for (const email of emails) {
      const user = await User.findOne({ email });
      if (
        user &&
        (user._id.toString() === workspace_admin ||
          user._id.toString() === sender_id)
      )
        continue;

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

// Process assigneeEmailQueue
assigneeEmailQueue.process(async (job) => {
  const { workspace, email, name, board_name, workspace_id, permission } =
    job.data;

  console.log("Processing assigneeEmailQueue:", email);

  try {
    const user = await User.findOne({ email });

    if (user) {
      await sendAssigneeMail(workspace, email, name, board_name);
    } else {
      throw new Error(`User not found for email: ${email}`);
    }
  } catch (error) {
    console.error(`Failed to send invite: ${error.message}`);
    throw error;
  }
});

// Export queues
export { emailQueue, assigneeEmailQueue };
