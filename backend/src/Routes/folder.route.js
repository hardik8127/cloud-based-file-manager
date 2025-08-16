import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createFolder,
  deleteFolder,
  getFolderById,
  getFolders,
  moveFolder,
  updateFolder,
} from "../controllers/folder.controller.js";

const folderRoutes = express.Router();

folderRoutes.post("/create", authMiddleware, createFolder);
folderRoutes.get("/get-folders", authMiddleware, getFolders);
folderRoutes.get("/:folderId", authMiddleware, getFolderById);
folderRoutes.put("/update/:folderId", authMiddleware, updateFolder);
folderRoutes.delete("/delete/:folderId", authMiddleware, deleteFolder);
folderRoutes.post("/move/:folderId", authMiddleware, moveFolder);

export default folderRoutes;
