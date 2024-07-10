import { Server } from "socket.io";
import fs from "fs";
import BoardSchema from "../Database/Model/boardModel.js";
import Workspace from "../Database/Model/workspaceModel.js";
import { createServer } from "http";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path"; // Import the path module
import pkg from "lodash";
const { debounce } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const connectedUsers = {};

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-document", ({ user, file_id }) => {
      if (!connectedUsers[file_id]) {
        connectedUsers[file_id] = [];
      }
      const existingUser = connectedUsers[file_id].find(
        (u) => u.id === socket.id,
      );
      if (!existingUser) {
        connectedUsers[file_id].push({ id: socket.id, user });
        socket.join(file_id);
        io.to(file_id).emit("update-users", connectedUsers[file_id]);
      }

      socket.on("disconnect", () => {
        connectedUsers[file_id] = connectedUsers[file_id].filter(
          (u) => u.id !== socket.id,
        );
        io.to(file_id).emit("update-users", connectedUsers[file_id]);
      });
    });

    socket.on("get-document", async (file_id) => {
      try {
        const saveDirectory = path.join(__dirname, "../../Files");
        const filePath = path.join(saveDirectory, `${file_id.filename}.json`);
        socket.join(file_id.file_id);

        const dataBuffer = await fs.promises.readFile(filePath);
        const dataString = dataBuffer.toString();

        let dat;
        if (dataString.trim() === "") {
          dat = { content: { ops: [] } };
        } else {
          dat = JSON.parse(dataString);
        }

        socket.emit("load-document", dat);
        socket.on("send-changes", (delta) => {
          socket.broadcast.to(file_id.file_id).emit("receive-changes", delta);
        });

        socket
          .on("save-document", async (data) => {
            await fs.promises.writeFile(
              filePath,
              JSON.stringify(data.content.ops, null, 2),
              "utf-8",
            );

            socket.emit("document-saved", {
              success: true,
              message: "Document saved successfully",
            });
          })
          .on("error", (error) => {
            console.error("Error saving document:", error);
            socket.emit("document-save-error", {
              success: false,
              message: "Error saving document",
            });
          });
      } catch (error) {
        console.error("Error reading document:", error);
        socket.emit("document-read-error", {
          success: false,
          message: "Error reading document",
        });
      }
    });

    socket.on("taskDragged", async (data) => {
      const { source, destination, board_id } = data;
      const boardName = board_id.name;

      try {
        const board = await BoardSchema.findOne({ name: boardName });

        if (!board) {
          console.log("Board not found");
          return;
        }

        const sourceCol = board.col.find(
          (col) => col._id.toString() === source.droppableId,
        );
        const destinationCol = board.col.find(
          (col) => col._id.toString() === destination.droppableId,
        );

        const [draggedItem] = sourceCol.items.splice(source.index, 1);

        destinationCol.items.splice(destination.index, 0, draggedItem);

        sourceCol.items.forEach((item, index) => {
          item.index = index;
        });

        destinationCol.items.forEach((item, index) => {
          item.index = index;
        });

        await board.save();

        io.emit("tasks", board);
      } catch (e) {
        console.log("Error updating board:", e);
      }
    });

    socket.on("createTask", async (data) => {
      const { task, board_id, user_ID } = data;
      console.log(user_ID);
      try {
        // Find the board by ID
        const board = await BoardSchema.findById(board_id);

        if (!board) {
          throw new Error("Board not found");
        }

        const newTask = {
          editor: user_ID.id,
          title: task,
        };

        // Find the index of the "pending" column in the board's col array
        const pendingIndex = 0; // Assuming you want to push to the first column

        if (pendingIndex === -1) {
          throw new Error("Pending column not found in board");
        }

        // Push the new task to the "items" array of the "pending" column
        board.col[0].items.push(newTask);

        // Save the updated board
        await board.save();

        // Emit updated tasks to all clients
        io.emit("tasks", board); // Emitting the whole board document, adjust as needed

        console.log("New task added to pending:", newTask);
      } catch (e) {
        console.error("Error creating task:", e);
        // Emit error message to the client
        io.emit("error", { message: e.message || "An error occurred" });
      }
    });
    socket.on("addComment", async (data) => {
      const { comment, board_id, user_ID, col_id, content_id } = data;

      try {
        const board = await BoardSchema.findById(board_id._id);

        if (!board) {
          throw new Error("Board not found");
        }

        const column = board.col.id(col_id);
        if (!column) {
          throw new Error("Column not found");
        }

        const contentItem = column.items.id(content_id);
        if (!contentItem) {
          throw new Error("Content item not found");
        }
        const newComment = {
          editor: user_ID.id,
          comment: comment,
        };

        await contentItem.comment.push(newComment);
        await board.save();

        await BoardSchema.populate(contentItem, {
          path: "comment.editor",
          select: "name",
          model: "User",
        });

        // Save the updated board

        io.emit("comments", contentItem.comment);
      } catch (e) {
        console.error("Error adding comment:", e);
        io.emit("error", { message: e.message || "An error occurred" });
      }
    });
    socket.on("fetchComments", async (data) => {
      const { board_id, col_id, content_id } = data;

      try {
        const board = await BoardSchema.findById(board_id);

        if (!board) {
          throw new Error("Board not found");
        }

        // Find the specific column by its ID
        const column = board.col.id(col_id);
        const contentItem = column?.items.id(content_id);

        // Populate the editor field in the comments
        await BoardSchema.populate(contentItem, {
          path: "comment.editor",
          select: "name",
          model: "User",
        });

        io.emit("commentsFetched", contentItem.comment);
      } catch (e) {
        console.error("Error fetching comments:", e);
        io.emit("error", { message: e.message || "An error occurred" });
      }
    });

    socket.on("fetch-board", async ({ board_id, workspace_id }) => {
      try {
        const boardData = await BoardSchema.findById(board_id).exec();
        socket.emit("load-board", boardData);
      } catch (e) {
        console.error(e);
        socket.emit("error", { message: e.message || "An error occurred" });
      }
    });
  });
  return io;
};

export default initSocket;
