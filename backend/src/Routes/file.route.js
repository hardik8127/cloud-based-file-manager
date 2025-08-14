import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  deleteFile,
  downloadFile,
  getFileById,
  getUserFiles,
  moveFile,
  renameFile,
  uploadFile,
  uploadMultipleFile,
} from "../controllers/file.controller.js";
import {
  handleUploadError,
  uploadSingle,
  validateFile,
} from "../middlewares/multer.middleware.js";

const fileRoutes = express.Router();

fileRoutes.post(
  "/upload",
  authMiddleware,
  uploadSingle,
  validateFile,
  handleUploadError,
  uploadFile
);
fileRoutes.post("/upload-multiple", authMiddleware, uploadMultipleFile);
fileRoutes.get("/get-user-files", authMiddleware, getUserFiles);
fileRoutes.get("/:id", authMiddleware, getFileById);
fileRoutes.put("/rename/:id", authMiddleware, renameFile);
fileRoutes.delete("/delete/:id", authMiddleware, deleteFile);
fileRoutes.post("/move/:id", authMiddleware, moveFile);
fileRoutes.get("/download/:id", authMiddleware, downloadFile);

export default fileRoutes;
