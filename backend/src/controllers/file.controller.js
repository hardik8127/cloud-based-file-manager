import { db } from "../configs/db.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../configs/cloudinary.js";
import { ERROR_MESSAGES } from "../utils/constants.js";
import axios from "axios";

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
          fileInfo: file,
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
      count: uploadData.length,
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

export const getUserFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      folderId,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {
      userId: userId,
      folderId: folderId || null,
    };

    const totalFiles = await db.File.count({
      where: whereClause,
    });

    const files = await db.File.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        cloudinaryUrl: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: skip,
      take: limitNum,
    });

    const totalPages = Math.ceil(totalFiles / limitNum);

    return res.status(200).json({
      success: true,
      message: "Files fetched successfully",
      data: {
        files,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalFiles,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user files:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching files",
      error,
    });
  }
};

export const getFileById = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    const file = await db.File.findFirst({
      where: {
        id: fileId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        cloudinaryUrl: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        shares: {
          select: {
            id: true,
            shareToken: true,
            permissions: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "File fetched successfully",
      data: file,
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching file",
      error,
    });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    const file = await db.File.findFirst({
      where: {
        id: fileId,
        userId: userId,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const deleteFileFromCloudinary = await deleteFromCloudinary(
      file.cloudinaryId
    );

    if (deleteFileFromCloudinary.result !== "ok") {
      return res.status(500).json({
        success: false,
        message: "Failed to delete file from storage",
      });
    }

    const deletedFile = await db.File.delete({
      where: {
        id: fileId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
      data: deletedFile,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({
      success: false,
      message: "File deletion failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const renameFile = async (req, res) => {
  try {
    const { newName } = req.body;
    const fileId = req.params.id;
    const userId = req.user.id;

    if (!newName || newName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "New name cannot be empty",
      });
    }

    const existingFile = await db.File.findFirst({
      where: {
        id: fileId,
        userId: userId,
      },
    });

    if (!existingFile) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const isFileNameTaken = await db.File.findFirst({
      where: {
        name: newName.trim(),
        folderId: existingFile.folderId,
        userId: userId,
        id: {
          not: fileId, 
        },
      },
    });

    if (isFileNameTaken) {
      return res.status(409).json({
        success: false,
        message: "File with this name already exists in this folder",
      });
    }

    const renamedFile = await db.File.update({
      where: {
        id: fileId,
      },
      data: {
        name: newName.trim(),
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        cloudinaryUrl: true,
        folderId: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "File renamed successfully",
      data: renamedFile,
    });
  } catch (error) {
    console.error("Error renaming file:", error);
    return res.status(500).json({
      success: false,
      message: "Error renaming file",
      error,
    });
  }
};

export const moveFile = async (req, res) => {
  try {
    const { folderId: targetFolderId } = req.body;
    const fileId = req.params.id;
    const userId = req.user.id;

    const existingFile = await db.File.findFirst({
      where: {
        id: fileId,
        userId: userId,
      },
    });

    if (!existingFile) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // If targetFolderId is provided, validate that the folder exists and belongs to the user
    if (targetFolderId) {
      const targetFolder = await db.Folder.findFirst({
        where: {
          id: targetFolderId,
          userId: userId,
        },
      });

      if (!targetFolder) {
        return res.status(404).json({
          success: false,
          message: "Target folder not found",
        });
      }
    }

    // Check if a file with the same name already exists in the target folder
    const fileNameConflict = await db.File.findFirst({
      where: {
        name: existingFile.name,
        folderId: targetFolderId || null,
        userId: userId,
        id: {
          not: fileId, // Exclude current file
        },
      },
    });

    if (fileNameConflict) {
      return res.status(409).json({
        success: false,
        message: "File with this name already exists in the target folder",
      });
    }

    // Move the file
    const movedFile = await db.File.update({
      where: {
        id: fileId,
      },
      data: {
        folderId: targetFolderId || null,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        cloudinaryUrl: true,
        folderId: true,
        updatedAt: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "File moved successfully",
      data: movedFile,
    });
  } catch (error) {
    console.error("Error moving file:", error);
    return res.status(500).json({
      success: false,
      message: "Error moving file",
      error,
    });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;

    const file = await db.File.findFirst({
      where: {
        id: fileId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        cloudinaryUrl: true,
        cloudinaryId: true,
        size: true,
        mimeType: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found or you don't have permission to download it",
      });
    }

    try {      

      // Stream through server using axios (more secure, allows logging)
      const response = await axios({
        method: 'GET',
        url: file.cloudinaryUrl,
        responseType: 'stream'
      });
      
      if (response.status !== 200) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch file from storage",
        });
      }

      // Set appropriate headers for file download
      const filename = file.originalName || file.name;
      const sanitizedFilename = filename.replace(/[^\w\s.-]/gi, '_'); // Sanitize filename
      
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
      res.setHeader('Content-Length', file.size);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream the file
      response.data.pipe(res);

      // Log the download (optional)
      console.log(`File downloaded: ${file.name} by user ${userId}`);

    } catch (fetchError) {
      console.error('Error fetching file from Cloudinary:', fetchError);
      return res.status(500).json({
        success: false,
        message: "Failed to download file",
      });
    }

  } catch (error) {
    console.error("Error in downloadFile:", error);
    return res.status(500).json({
      success: false,
      message: "Error downloading file",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
