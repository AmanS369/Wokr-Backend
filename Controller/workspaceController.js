import User from "../Database/Model/userModel.js";
import Workspace from "../Database/Model/workspaceModel.js";
import UserWorkspace from "../Database/Model/userWorkspace.js";
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
    const admin = req.user;
    const workspace = new Workspace({ title, description, admin });
    await workspace.save();
    admin.workspaces.push(workspace._id);
    sendResponse(res, true, "Workspace created");
  } catch (e) {
    console.log(e);
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
    let successfulInvitations = [];
    let failedInvitations = [];
    for (const email of emails) {
      const user = await User.findOne({ email });
      if (user) {
        const tokenIdentifier = generateTokenId();
        const token = JWT.sign(
          { workspace_id, email, permission, jti: tokenIdentifier },
          process.env.SECRET_KEY,
          {
            expiresIn: "1d",
          }
        );
        await Token.create({ tokenId: tokenIdentifier });
        await sendInviteMail(workspace.title, email, user.name, token);
        successfulInvitations.push(email);
      } else {
        failedInvitations.push(email);
      }
    }
    res.status(200).send({
      success: true,
      message: "Invite emails sent successfully",
      successfulInvitations,
      failedInvitations,
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
    const { accept_token } = req.params;
    const user = req.user;
    const { workspace_id, email, permission, jti } = JWT.verify(
      accept_token,
      process.env.SECRET_KEY
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
        })
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

    // Use await to get the workspace document
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
      "../Files",
      `${uniqueFileName}.txt`
    );

    // Check if a file with the same name already exists in the workspace
    const fileWithSameName = workspace.files.find(
      (file) => file.name === uniqueFileName
    );
    if (fileWithSameName) {
      return res.status(400).send({
        success: false,
        message: "A file with the same name already exists in the workspace",
      });
    }

    // Check permissions
    let hasPermission = user === workspace.admin;

    if (!hasPermission) {
      const member = await workspace.members.find((m) =>
        m.member.equals(req.user._id)
      );

      hasPermission = member && member.permissions === "EDIT";
    }

    if (!hasPermission) {
      return res.status(403).send({
        success: false,
        message: "You don't have permission to create a file",
      });
    }

    // Create the file
    await fs.writeFile(filePath, "");

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
    const workspace = await Workspace.findOne({ _id: req.params.workspace_id });

    if (workspace) {
      const isMember = workspace.members.find((m) =>
        m.member.equals(req.user._id)
      );

      if (isMember) {
        let userPermission = 0; // Default to READ

        if (req.user._id == workspace.admin) {
          userPermission = 1; // Admin
        } else {
          const member = workspace.members.find((m) =>
            m.member.equals(req.user._id)
          );

          if (member && member.permissions === "EDIT") {
            userPermission = 2; // EDIT
          }
        }

        sendResponse(res, true, "Workspace fetched", {
          workspace,
          userPermission,
        });
      } else {
        sendResponse(res, false, "You are not allowed");
      }
    } else {
      sendResponse(res, false, "No workspace found");
    }
  } catch (e) {
    console.error(e);
    sendResponse(res, false, "Something went wrong, try again");
  }
};

export const jsaveFileController = async (req, res) => {
  try {
    const { fileName, content } = req.body;
    console.log("the content are", content.ops);
    // Assuming content is an object with a property 'ops'
    const ops = content.ops;

    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const saveDirectory = path.join(__dirname, "../Files");
    const filePath = path.join(saveDirectory, `${fileName}.txt`);
    console.log(filePath);
    const opsJSONString = JSON.stringify(content.ops, null, 2);
    // Check if the file already exists
    const fileExists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      res.status(500).json({ success: false, message: "File not found" });
      console.log("no file");
      return;
    }

    // Update the content of the existing file
    await fs.writeFileS(filePath, opsJSONString, "utf-8");

    res
      .status(200)
      .json({ success: true, message: "File updated successfully" });
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
