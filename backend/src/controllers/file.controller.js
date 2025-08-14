import { db } from "../configs/db.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../configs/cloudinary.js";
import { ERROR_MESSAGES } from "../utils/constants.js";

export const uploadFile = async (req, res) => {
  try {
    const { fileInfo } = req;
    const userId = req.user.id;
    const folderId = req.body?.folderId || null;

    if (!fileInfo) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.NO_FILE_UPLOADED,
      });
    }

    const uploadResult = await uploadToCloudinary(
      fileInfo.buffer,
      fileInfo.name,  
      userId,
      folderId ? `folder_${folderId}` : "files"
    );

    const uploadData = await db.File.create({
      data: {
        name: fileInfo.name,
        originalName: fileInfo.originalName,
        cloudinaryUrl: uploadResult.url,
        cloudinaryId: uploadResult.public_id,
        userId: userId,
        folderId: folderId || null,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
      },
    });

    console.log("uploaded file", uploadData);

    return res.status(201).json({
      success: true,
      message: "File uploaded Successfull",
      uploadData,
    });
  } catch (error) {
    console.error("Error in uploading single File", error);
    return res.status(500).json({
      success: false,
      message: "Error in uploading file",
      error,
    });
  }
};

export const uploadMultipleFile = async (req, res) => {
  try {
    const { filesInfo } = req;
    const userId = req.user.id;
    const folderId = req.body?.folderId || null;

    if (!filesInfo || filesInfo.length === 0) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.NO_FILE_UPLOADED,
      });
    }

    const uploadResults = await Promise.all(
      filesInfo.map(async (file) => {
        const result = await uploadToCloudinary(
          file.buffer,
          file.name,
          userId,
          folderId ? `folder_${folderId}` : "files"
        );
        return {
          cloudinaryResult: result,
          fileInfo: file
        };
      })
    );


    const uploadData = await Promise.all(
      uploadResults.map(async ({ cloudinaryResult, fileInfo }) => {
        const dbRecord = await db.File.create({
          data: {
            name: fileInfo.name,
            originalName: fileInfo.originalName,
            cloudinaryUrl: cloudinaryResult.url,
            cloudinaryId: cloudinaryResult.public_id,
            userId: userId,
            folderId: folderId || null,
            size: fileInfo.size,
            mimeType: fileInfo.mimeType,
          },
        });
        return dbRecord;
      })
    );

    console.log("uploaded files", uploadData);

    return res.status(201).json({
      success: true,
      message: `${uploadData.length} files uploaded successfully`,
      uploadData,
      count: uploadData.length
    });
  } catch (error) {
    console.error("Error in uploading single File", error);
    return res.status(500).json({
      success: false,
      message: "Error in uploading multiple files",
      error,
    });
  }
};

export const getUserFiles = async (req, res) => {};

export const getFileById = async (req, res) => {};

export const deleteFile = async (req, res) => {};

export const renameFile = async (req, res) => {};

export const moveFile = async (req, res) => {};

export const downloadFile = async (req, res) => {};
