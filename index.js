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
import http from "http"; // Import the 'http' module for Socket.io
import { Server } from "socket.io";
import fs from "fs";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
//confiq
dotenv.config();
//databse
connDB();

const app = express();
app.use(cors());
// const server = http.createServer(app);

app.get("/", (req, res) => {
  res.send({});
});

const filesFolderPath = path.join(__dirname, "../Files");

app.use("/api/v1/files", express.static(filesFolderPath));

app.use(express.json());
app.use(morgan("dev"));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/work", workspaceroute);

app.use("/images", express.static(path.join(__dirname, "images")));
const PORT = process.env.PORT || 7000;

const httpServer = createServer(app);
const activeUsers = {};

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
      const saveDirectory = path.join(__dirname, "../Files");
      const filePath = path.join(saveDirectory, `${file_id.filename}.json`);
      socket.join(file_id.file_id);

      const dataBuffer = await fs.promises.readFile(filePath);
      const dataString = dataBuffer.toString(); // Convert Buffer to string

      let dat;
      if (dataString.trim() === "") {
        dat = { content: { ops: [] } };
      } else {
        dat = JSON.parse(dataString);
      }

      // console.log("this is data", dat);
      socket.emit("load-document", dat);
      // console.log("the filene is", file_id.file_id);
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

          // Optionally emit success event or perform other actions here
          socket.emit("document-saved", {
            success: true,
            message: "Document saved successfully",
          });
        })
        .on("error", (error) => {
          console.error("Error saving document:", error);
          // Optionally emit error event or perform other error-handling actions here
          socket.emit("document-save-error", {
            success: false,
            message: "Error saving document",
          });
        });
    } catch (error) {
      console.error("Error reading document:", error);
      // Optionally emit error event or perform other error-handling actions here
      socket.emit("document-read-error", {
        success: false,
        message: "Error reading document",
      });
    }
  });
});

const connectedUsers = {};

// io.on("connection", (socket) => {
//   socket.on("join-document", ({ user, file_id }) => {
//     if (!connectedUsers[file_id]) {
//       connectedUsers[file_id] = [];
//     }
//     connectedUsers[file_id].push({ id: socket.id, user });
//     socket.join(file_id);
//     io.to(file_id).emit("update-users", connectedUsers[file_id]);

//     socket.on("disconnect", () => {
//       connectedUsers[file_id] = connectedUsers[file_id].filter(
//         (u) => u.id !== socket.id,
//       );
//       io.to(file_id).emit("update-users", connectedUsers[file_id]);
//     });
//   });

//   socket.on("get-document", async (file_id) => {
//     // Existing code for loading and broadcasting the document...
//   });

//   socket.on("send-changes", (delta) => {
//     socket.broadcast.to(file_id).emit("receive-changes", delta);
//   });

//   socket.on("save-document", async (data) => {
//     // Existing code for saving the document...
//   });
// });

httpServer.listen(7000, () => {
  const fullURL = `http://localhost:${PORT}`; // Construct the full URL
  console.log(`Express server running at ${fullURL}`);
});
