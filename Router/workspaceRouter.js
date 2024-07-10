import express from "express";
import { requireSign } from "../Middleware/authMiddleware.js";
import {
  acceptInviteController,
  createBoard,
  createWorkspace,
  createWorkspaceFile,
  deleteWorkspace,
  getWorkspaceDetails,
  saveFileController,
  sendEmailAssignee,
  sendInviteController,
  sharedworkspace,
  showAllworkspace,
  showMembersController,
} from "../Controller/workspaceController.js";
const router = express.Router();
router.post("/create-workspace", requireSign, createWorkspace);
router.post("/delete-workspace/:workspace_id", requireSign, deleteWorkspace);
router.post("/send-invite/:workspace_id", requireSign, sendInviteController);
router.post("/accept-invite", requireSign, acceptInviteController);
router.get("/all-workspace", requireSign, sharedworkspace);
// router.get("/shared-workspace", requireSign, sharedworkspace);
router.post("/create-file/:workspace_id", requireSign, createWorkspaceFile);
router.get("/get-workspace/:workspace_id", requireSign, getWorkspaceDetails);
router.post("/save-file/:workspace_id", requireSign, saveFileController);
router.get("/show-members/:workspace_id", requireSign, showMembersController);
router.get("/delete-user", requireSign);
router.post("/create-board/:workspace_id", requireSign, createBoard);
router.get("/show-members/:workspace_id", requireSign, showMembersController);
router.get(
  "/get-assignee/:workspace_id/:board_id/:col_id/:item_id",
  requireSign,
);

router.post(
  "/add-assignee/:workspace_id/:board_id/:col_id/:item_id",
  requireSign,
  sendEmailAssignee,
);
export default router;
