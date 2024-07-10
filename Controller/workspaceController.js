import User from "../Database/Model/userModel.js";
import Workspace from "../Database/Model/workspaceModel.js";
import BoardSchema from "../Database/Model/boardModel.js";

import { emailQueue, assigneeEmailQueue } from "../Task/email_taskQueue.js";
import JWT from "jsonwebtoken";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
import { compare } from "bcrypt";
import path from "path";
import { sendInviteMail } from "../helper/sendInvite.js";
import Token from "../Database/token.js";
import generateTokenId from "../helper/uniqueToken.js";
import { promises as fsPromises } from "fs";

const sendResponse = (res, success, message, data = null) => {
  return res.status(success ? 200 : 500).send({
    success,
    message,
    data,
  });
};

export const createWorkspace = async (req, res) => {
  try {
    const { title, description } = req.body;
    const adminId = req.user._id;

    const workspace = new Workspace({ title, description, admin: adminId });
    await workspace.save();

    const admin = await User.findById(adminId);

    if (!admin.workspaces) {
      admin.workspaces = [];
    }

    admin.workspaces.push(workspace._id);
    await admin.save();

    sendResponse(res, true, "Workspace created");
  } catch (e) {
    console.error(e);
    sendResponse(res, false, "Something went wrong, try again");
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const workspace_id = req.params.workspace_id; // Correctly extract workspace_id from params
    const password = req.body.password;
    const admin = req.user._id;
    const user = await User.findOne({ _id: admin });
    const workspace = await Workspace.findById(workspace_id).populate("admin"); // Use the correct workspace_id

    if (workspace.admin._id.equals(admin)) {
      const match = await compare(String(password), String(user.password));
      if (match) {
        await Workspace.deleteOne({ _id: workspace_id });
        res.status(200).send({
          success: true,
          message: "Workspace Deleted",
        });
      } else {
        res.status(401).send({
          success: false,
          message: "Wrong Password",
        });
      }
    } else {
      res.status(403).send({
        success: false,
        message: "You are not authorized Admin",
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({
      success: false,
      message: "Something went wrong, try again",
    });
  }
};
export const sendInviteController = async (req, res) => {
  try {
    const workspace_id = req.params.workspace_id;
    console.log("work", workspace_id);
    const emails = req.body.email;
    const permission = req.body.permission;
    const senderId = req.user._id;
    console.log("emai", emails);
    const workspace = await Workspace.findById(workspace_id).populate("admin");
    if (!workspace) {
      return res.status(404).send({
        success: false,
        message: "Workspace not found",
      });
    }
    console.log(workspace.admin._id, " ", senderId);
    if (!workspace.admin._id.equals(senderId)) {
      const senderPermission = await Workspace.findOne({
        "members.member": senderId,
        "members.permissions": "EDIT",
      });
      if (!senderPermission) {
        return res.status(403).send({
          success: false,
          message:
            "You do not have permission to send invitations for this workspace",
        });
      }
    }

    emailQueue.add({
      workspace_id: workspace._id,
      emails,
      permission: permission,
      workspaceTitle: workspace.title,
      workspace_admin: workspace.admin._id,
      sender_id: senderId,
    });
    res.status(200).send({
      success: true,
      message: "Invite emails are being sent Shortly",
    });
  } catch (e) {
    console.error(e);
    res.status(500).send({
      success: false,
      message: "Something went wrong, try again",
    });
  }
};

export const acceptInviteController = async (req, res) => {
  try {
    const { accept_token } = req.body;
    const user = req.user;
    const { workspace_id, email, permission, jti } = JWT.verify(
      accept_token,
      process.env.SECRET_KEY,
    );
    const workspace = await Workspace.findById(workspace_id);
    const user_data = await User.findOne({ _id: user._id });
    const tokenExists = await Token.findOneAndDelete({ tokenId: jti });

    if (tokenExists && user_data.email == email) {
      if (!workspace.members.find((m) => m.member.equals(req.user._id))) {
        workspace.members.push({
          member: user._id,
          permissions: permission,
        });
        await workspace.save();
      } else {
        sendResponse(res, false, "You r already a member");
      }

      // Add the workspace to the user
      user_data.workspaces.push(workspace._id);
      await user_data.save();

      res.status(200).send({
        success: true,
        message: "You Accepted the Invitation",
      });
    } else {
      res.status(500).send({
        success: false,
        message: "Something went wrong, with Link",
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({
      success: false,
      message: "Something went wrong, try again",
    });
  }
};

export const showAllworkspace = async (req, res) => {
  try {
    const user = req.user;
    const workspace = Workspace.find({ admin: user._id }).sort({
      createdAt: -1,
    });
    if (workspace) {
      res.status(200).send({
        success: true,
        workspace,
      });
    } else {
      res.status(500).send({
        success: false,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({
      success: false,
      message: "Something went wrong try again",
    });
  }
};

export const sharedworkspace = async (req, res) => {
  try {
    const user = req.user;

    const userWithWorkspaces = await User.findById(user._id).populate({
      path: "workspaces",
      populate: {
        path: "admin",
        select: "name",
      },
    });

    if (userWithWorkspaces) {
      // Extract relevant data from each workspace
      const formattedWorkspaces = userWithWorkspaces.workspaces.map(
        (workspace) => ({
          _id: workspace._id,
          title: workspace.title,
          description: workspace.description,
          isAdmin: workspace.admin._id.equals(user._id),
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
        }),
      );

      res.status(200).send({
        success: true,
        workspaces: formattedWorkspaces,
      });
    } else {
      res.status(500).send({
        success: false,
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).send({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const createWorkspaceFile = async (req, res) => {
  try {
    const user = req.user._id;
    const fileName = req.body.fileName;
    const workspace_id = req.params.workspace_id?.toString();
    const uniqueFileName = `${fileName}_${workspace_id}`;

    const workspace = await Workspace.findById(workspace_id);

    if (!workspace) {
      return res.status(404).send({
        success: false,
        message: "Workspace not found",
      });
    }

    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.resolve(
      __dirname,
      "../../Files",
      `${uniqueFileName}.json`,
    );

    // Check if a file with the same name already exists in the workspace
    const fileWithSameName = workspace.files.find(
      (file) => file.name === uniqueFileName,
    );
    if (fileWithSameName) {
      return res.status(400).send({
        success: false,
        message: "A file with the same name already exists in the workspace",
      });
    }

    // Check permissions
    const isAdmin = user === workspace.admin._id.toString();

    let hasPermission = isAdmin;

    if (!hasPermission) {
      const member = await workspace.members.find((m) =>
        m.member.equals(req.user._id),
      );

      hasPermission = member && member.permissions === "EDIT";
    }

    if (!hasPermission) {
      console.log("You don't have permission to create a file");
      return res.status(403).send({
        success: false,
        message: "You don't have permission to create a file",
      });
    }

    // Create the file
    await fsPromises.writeFile(filePath, "");

    // Save file information in the database
    const fileData = {
      name: uniqueFileName,
      path: filePath,
    };

    // Push the fileData into the files array of the workspace
    workspace.files.push(fileData);

    // Save the updated workspace document
    await workspace.save();

    return res.status(200).send({
      success: true,
      message: "File Created Successfully",
      file: fileData,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: "Something went wrong, please try again",
    });
  }
};

export const getWorkspaceDetails = async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ _id: req.params.workspace_id })
      .populate({
        path: "boards",
        select: "name",
      })
      .exec();

    if (!workspace) {
      return sendResponse(res, false, "Workspace not found");
    }

    let userPermission = 1;

    if (req.user._id.toString() === workspace.admin._id.toString()) {
      userPermission = 1; // Admin
    } else {
      const member = workspace.members.find((m) =>
        m.member.equals(req.user._id),
      );

      if (member) {
        if (member.permissions === "EDIT") {
          userPermission = 2; // EDIT
        } else if (member.permissions === "READ") {
          userPermission = 3; // READ
        }
      } else {
        return sendResponse(res, false, "You are not allowed");
      }
    }

    sendResponse(res, true, "You are allowed", {
      workspace,
      userPermission,
    });
  } catch (e) {
    console.error(e);
    sendResponse(res, false, "Something went wrong, try again");
  }
};

export const saveFileController = async (req, res) => {
  try {
    const { fileName, content } = req.body;
    console.log("the content are", content.ops);
    const ops = content.ops;

    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const saveDirectory = path.join(__dirname, "../Files");
    const filePath = path.join(saveDirectory, `${fileName}.json`);
    console.log(filePath);

    const opsJSONString = JSON.stringify(content.ops, null, 2);

    // Check if the file already exists
    const fileExists = await fsPromises
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      res.status(500).json({ success: false, message: "File not found" });
      console.log("no file");
      return;
    }

    // Update the content of the existing file using fs.promises.writeFile
    await fsPromises.writeFile(filePath, opsJSONString, "utf-8");

    res
      .status(200)
      .json({ success: true, message: "File updated successfully" });
  } catch (e) {
    console.error(e);
    sendResponse(res, false, "Something went wrong, try again");
  }
};

export const showMembersController = async (req, res) => {
  try {
    const workspace_id = req.params.workspace_id;

    // Find the workspace with the given workspace_id
    const workspace = await Workspace.findById(workspace_id)
      .populate("members.member", "name email ")
      .populate("admin", "name email ");

    if (!workspace) {
      // If the workspace is not found, send a 404 Not Found response
      sendResponse(res, false, "Workspace not found", 404);
    }

    // Extract the admin and members fields from the workspace document
    const { admin, members } = workspace;

    const modifiedMembers = members.map((member) => {
      return {
        name: member.member.name,
        email: member.member.email,
        permission: member.permissions,
      };
    });

    const modifiedAdmin = {
      name: admin.name,
      email: admin.email,
      permission: "ADMIN",
    };
    console.log("ALl memeber", members, admin);

    // send Response with success = true
    sendResponse(res, true, "Members and admin retrieved successfully", {
      members: modifiedMembers,
      admin: modifiedAdmin,
    });
  } catch (error) {
    console.error(error);

    // send Response with success = false
    sendResponse(res, false, "Failed to retrieve members and admin");
  }
};

// export const deleteWorkspaceMember = aysnc(req,res)=>{
//    try{
//     const {workspace_id,user_id}

//    }catch(e){
//     console.error(e);
//     sendResponse(res, false, "Something went wrong, try again");
//    }
// }

export const createBoard = async (req, res) => {
  try {
    const user = req.user;
    const { boardName } = req.body;
    const workspace_id = req.params.workspace_id?.toString();
    const uniqueBoardName = `${boardName}_${workspace_id}`;

    const workspace = await Workspace.findById(workspace_id);

    if (!workspace) {
      return res.status(404).send({
        success: false,
        message: "Workspace not found",
      });
    }

    // Check permissions
    // const isAdmin = user._id.equals(workspace.admin);

    // let hasPermission = isAdmin;

    // if (!hasPermission) {
    //   const member = workspace.members.find((m) => m.member.equals(user._id));

    //   hasPermission = member && member.permissions === "EDIT";
    // }

    // if (!hasPermission) {
    //   console.log("You don't have permission to create a Board");
    //   return res.status(403).send({
    //     success: false,
    //     message: "You don't have permission to create a Board",
    //   });
    // }

    const boardWithSameName = workspace.boards.find(
      (boardId) => boardId.name === uniqueBoardName, // Assuming boardId contains the _id of boards
    );

    if (boardWithSameName) {
      return res.status(400).send({
        success: false,
        message: "A Board with the same name already exists in the workspace",
      });
    }

    // Create new Board document
    const newBoard = new BoardSchema({
      name: uniqueBoardName,
      createdBy: user._id,
      col: [
        { title: "pending" },
        { title: "progress" },
        { title: "completed" },
      ],
    });

    // Save the board to the database
    newBoard.push;
    await newBoard.save();

    // Add board _id to workspace.boards array
    workspace.boards.push(newBoard._id);

    // Save the updated workspace document
    await workspace.save();

    return res.status(200).send({
      success: true,
      message: "Board Created Successfully",
      board: newBoard,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: "Something went wrong, please try again",
    });
  }
};

export const getAllAssignee = async (req, res) => {
  try {
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: "Something went wrong, please try again",
    });
  }
};

export const sendEmailAssignee = async (req, res) => {
  try {
    const { workspace_id, board_id, col_id, item_id } = req.params;
    const { user_id } = req.body;

    // Find the workspace by ID and populate members and admin
    const workspace = await Workspace.findById(workspace_id)
      .populate("members.member", "name email")
      .populate("admin", "name email");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if the user is a member or admin of the workspace
    const isMember = workspace.members.some(
      (member) => member.member._id.toString() === user_id,
    );
    const isAdmin = workspace.admin._id.toString() === user_id;

    if (!isMember && !isAdmin) {
      return res
        .status(404)
        .json({ message: "User does not exist in the workspace" });
    }

    // Find the board by ID
    const board = await BoardSchema.findById(board_id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Find the column by ID within the board
    const column = board.col.find((col) => col._id.toString() === col_id);

    if (!column) {
      return res.status(404).json({ message: "Column not found" });
    }

    // Find the item by ID within the column
    const item = column.items.find((item) => item._id.toString() === item_id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check if the assignee already exists
    const assigneeExists = item.assignee.find(
      (assignee) => assignee.assignee.toString() === user_id,
    );

    if (assigneeExists) {
      return res.status(400).json({ message: "Assignee already exists" });
    }

    // Create a new assignee object
    const newAssignee = { assignee: user_id };

    // Add the assignee to the item's assignees array
    item.assignee.push(newAssignee);

    // Save the board with the updated item
    await board.save();

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    assigneeEmailQueue.add({
      workspace: workspace,
      email: user.email,
      name: user.name,
      board_name: board.name,
    });
    res.status(200).json({ message: "Assignee added successfully", user });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: "Something went wrong, please try again",
    });
  }
};
