import { Schema, model } from "mongoose";

const tokenSchema = new Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "1d",
  },
});

const Token = model("Token", tokenSchema);

export default Token;
