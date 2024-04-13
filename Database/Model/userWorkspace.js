import mongoose from "mongoose";
const permissionEnum = ["none", "READ", "EDIT"];
const userWorkspaceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    permissions: {
      type: String,
      enum: permissionEnum,
      default: "none",
    },
  },
  { timestamps: true }
);

const UserWorkspace = mongoose.model("UserWorkspace", userWorkspaceSchema);

export default UserWorkspace;
