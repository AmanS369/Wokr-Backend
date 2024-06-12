// redisConfig.js
import dotenv from "dotenv";
dotenv.config();
const redisConfig = {
  host: process.env.REDIS_URL,
  port: process.env.REDIS_PORT,
};
export default redisConfig;
