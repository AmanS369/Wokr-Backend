import mongoose from "mongoose";
const permissionEnum = ["none", "READ", "EDIT"];
import BoardSchema from "./boardModel.js";
const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

const members = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permissions: {
      type: String,
      enum: permissionEnum,
      default: "none",
    },
  },
  { timestamps: true },
);

const workspaceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [members],
    files: [fileSchema],
    boards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BoardSchema",
      },
    ],
  },
  { timestamps: true },
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
