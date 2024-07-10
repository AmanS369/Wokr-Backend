// import express from "express";
// import dotenv from "dotenv";
// import morgan from "morgan";
// import connDB from "./Database/conn.js";
// import cors from "cors";
// import authRoutes from "./Router/authRouter.js";
// import workspaceroute from "./Router/workspaceRouter.js";
// import path from "path";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
// import pkg from "lodash";
// const { debounce } = pkg;

// import { Server } from "socket.io";
// import fs from "fs";
// import { createServer } from "http";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Configuration
// dotenv.config();
// connDB();

// const app = express();
// app.use(cors());
// app.use(express.json());
// app.use(morgan("dev"));

// // Routes
// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/work", workspaceroute);

// const filesFolderPath = path.join(__dirname, "../Files");
// const boardsFolderPath = path.join(__dirname, "../Boards");
// app.use("/api/v1/files", express.static(filesFolderPath));
// app.use("/api/v1/boards", express.static(boardsFolderPath));
// app.use("/images", express.static(path.join(__dirname, "images")));

// const PORT = process.env.PORT || 7000;
// const httpServer = createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: "http://localhost:3000",
//   },
// });

// // Cache and concurrency control
// const boardCache = {};
// const lockMap = {};

// const acquireLock = async (key) => {
//   while (lockMap[key]) {
//     await new Promise((resolve) => setTimeout(resolve, 10));
//   }
//   lockMap[key] = true;
// };

// const releaseLock = (key) => {
//   delete lockMap[key];
// };

// const fetchBoardData = async (boardName) => {
//   const saveDirectory = path.join(__dirname, "../Boards");
//   const boardPath = path.join(saveDirectory, `${boardName}.json`);
//   if (boardCache[boardName]) {
//     return boardCache[boardName];
//   }
//   const content = await fs.promises.readFile(boardPath);
//   const data = JSON.parse(content);
//   boardCache[boardName] = data;
//   return data;
// };

// const writeBoardData = async (boardName, data) => {
//   const saveDirectory = path.join(__dirname, "../Boards");
//   const boardPath = path.join(saveDirectory, `${boardName}.json`);
//   await fs.promises.writeFile(
//     boardPath,
//     JSON.stringify(data, null, 2),
//     "utf-8",
//   );
//   boardCache[boardName] = data;
// };

// io.on("connection", (socket) => {
//   socket.on("join-document", ({ user, file_id }) => {
//     if (!connectedUsers[file_id]) {
//       connectedUsers[file_id] = [];
//     }
//     const existingUser = connectedUsers[file_id].find(
//       (u) => u.id === socket.id,
//     );
//     if (!existingUser) {
//       connectedUsers[file_id].push({ id: socket.id, user });
//       socket.join(file_id);
//       io.to(file_id).emit("update-users", connectedUsers[file_id]);
//     }

//     socket.on("disconnect", () => {
//       connectedUsers[file_id] = connectedUsers[file_id].filter(
//         (u) => u.id !== socket.id,
//       );
//       io.to(file_id).emit("update-users", connectedUsers[file_id]);
//     });
//   });

//   socket.on("get-document", async (file_id) => {
//     try {
//       const saveDirectory = path.join(__dirname, "../Files");
//       const filePath = path.join(saveDirectory, `${file_id.filename}.json`);
//       socket.join(file_id.file_id);

//       const dataBuffer = await fs.promises.readFile(filePath);
//       const dataString = dataBuffer.toString();

//       let dat;
//       if (dataString.trim() === "") {
//         dat = { content: { ops: [] } };
//       } else {
//         dat = JSON.parse(dataString);
//       }

//       socket.emit("load-document", dat);
//       socket.on("send-changes", (delta) => {
//         socket.broadcast.to(file_id.file_id).emit("receive-changes", delta);
//       });

//       socket
//         .on("save-document", async (data) => {
//           await fs.promises.writeFile(
//             filePath,
//             JSON.stringify(data.content.ops, null, 2),
//             "utf-8",
//           );

//           socket.emit("document-saved", {
//             success: true,
//             message: "Document saved successfully",
//           });
//         })
//         .on("error", (error) => {
//           console.error("Error saving document:", error);
//           socket.emit("document-save-error", {
//             success: false,
//             message: "Error saving document",
//           });
//         });
//     } catch (error) {
//       console.error("Error reading document:", error);
//       socket.emit("document-read-error", {
//         success: false,
//         message: "Error reading document",
//       });
//     }
//   });

//   const debouncedWriteTasksToFile = debounce(writeBoardData, 1000);

//   socket.on("taskDragged", async (data) => {
//     const { source, destination, board_id } = data;
//     const boardName = board_id.name;
//     await acquireLock(boardName);

//     try {
//       const tasks = await fetchBoardData(boardName);

//       const itemMoved = {
//         ...tasks[source.droppableId].items[source.index],
//       };

//       tasks[source.droppableId].items.splice(source.index, 1);
//       tasks[destination.droppableId].items.splice(
//         destination.index,
//         0,
//         itemMoved,
//       );

//       io.emit("tasks", tasks);
//       debouncedWriteTasksToFile(boardName, tasks);
//     } finally {
//       releaseLock(boardName);
//     }
//   });

//   socket.on("createTask", async (data) => {
//     const newTask = { id: fetchID(), title: data.task, comments: [] };
//     const boardName = data.board_id.name;
//     await acquireLock(boardName);

//     try {
//       const tasks = await fetchBoardData(boardName);
//       tasks["pending"].items.push(newTask);

//       io.emit("tasks", tasks);
//       debouncedWriteTasksToFile(boardName, tasks);
//     } finally {
//       releaseLock(boardName);
//     }
//   });

//   socket.on("addComment", async (data) => {
//     const { category, user, comment, board_id, id } = data;
//     const boardName = board_id.name;
//     await acquireLock(boardName);

//     try {
//       const tasks = await fetchBoardData(boardName);
//       const taskItems = tasks[category].items;

//       for (let i = 0; i < taskItems.length; i++) {
//         if (taskItems[i].id === id) {
//           taskItems[i].comments.push({
//             name: user.user.name,
//             text: comment,
//             timestamp: new Date().toISOString(),
//             id: fetchID(),
//           });
//           io.emit("comments", taskItems[i].comments);
//           debouncedWriteTasksToFile(boardName, tasks);
//           break;
//         }
//       }
//     } finally {
//       releaseLock(boardName);
//     }
//   });

//   socket.on("fetchComments", async (data) => {
//     const { category, id, board_id } = data;
//     const tasks = await fetchBoardData(board_id.name);
//     const taskItems = tasks[category]?.items;
//     for (let i = 0; i < taskItems?.length; i++) {
//       if (taskItems[i].id === id) {
//         socket.emit("comments", taskItems[i]?.comments);
//       }
//     }
//   });

//   socket.on("fetch-board", async ({ board_id }) => {
//     try {
//       const tasks = await fetchBoardData(board_id.name);
//       socket.emit("load-board", tasks);
//     } catch (e) {
//       console.log(e);
//     }
//   });
// });

// const connectedUsers = {};

// httpServer.listen(PORT, () => {
//   const fullURL = `http://localhost:${PORT}`;
//   console.log(`Express server running at ${fullURL}`);
// });

// const fetchID = () => Math.random().toString(36).substring(2, 10);
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import connDB from "./Database/conn.js";
import cors from "cors";
import authRoutes from "./Router/authRouter.js";
import workspaceroute from "./Router/workspaceRouter.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Server } from "socket.io";
import fs from "fs";
import { createServer } from "http";
import socket from "./Socket/Socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
dotenv.config();
connDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/work", workspaceroute);

const filesFolderPath = path.join(__dirname, "../Files");
const boardsFolderPath = path.join(__dirname, "../Boards");
app.use("/api/v1/files", express.static(filesFolderPath));
// app.use("/api/v1/boards", express.static(boardsFolderPath));
app.use("/images", express.static(path.join(__dirname, "images")));

const PORT = process.env.PORT || 7000;
const httpServer = createServer(app);

const io = socket(httpServer);

httpServer.listen(PORT, () => {
  const fullURL = `http://localhost:${PORT}`;
  console.log(`Express server running at ${fullURL}`);
});
