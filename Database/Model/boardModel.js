import mongoose from "mongoose";
const commentSchema = new mongoose.Schema(
  {
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      default: "none",
    },
  },
  { timestamps: true },
);

const assigneeSchema = new mongoose.Schema(
  {
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const contentSchema = new mongoose.Schema(
  {
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "none",
    },
    assignee: [assigneeSchema],
    comment: [commentSchema],
  },
  { timestamps: true },
);

const baordSchema = new mongoose.Schema({
  name: {
    type: String,
    default: "none",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  col: [
    {
      title: String,
      items: [contentSchema],
    },
  ],
});

const BoardSchema = mongoose.model("BoardSchema", baordSchema);
export default BoardSchema;
