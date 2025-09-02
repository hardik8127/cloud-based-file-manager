import { db } from "../configs/db.js";
import {
  buildFolderHierarchy,
  buildBreadcrumbPath,
  cascadeDeleteFolder,
  checkCircularReference,
  calculateFolderDepth,
} from "../utils/utils.js";

export const createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Folder name is required",
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Folder name too long (max 255 characters)",
      });
    }

    if (parentId) {
      const parentFolder = await db.Folder.findFirst({
        where: {
          id: parentId,
          userId: userId,
        },
      });

      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          message: "Parent folder not found",
        });
      }
    }

    const existingFolder = await db.Folder.findFirst({
      where: {
        userId: userId,
        name: trimmedName,
        parentId: parentId || null,
      },
    });

    if (existingFolder) {
      return res.status(409).json({
        success: false,
        message: "Folder with this name already exists in this location",
      });
    }

    const newFolder = await db.Folder.create({
      data: {
        name: trimmedName,
        userId: userId,
        parentId: parentId || null,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Folder created successfully",
      data: newFolder,
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating folder",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      parentId = null,
      includeHierarchy = false,
      page = 1,
      limit = 50,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause = {
      userId: userId,
      parentId: parentId === "null" ? null : parentId,
    };

    // Get total count for pagination
    const totalFolders = await db.Folder.count({
      where: whereClause,
    });

    // Get folders with metadata
    const folders = await db.Folder.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        // Count files in each folder
        _count: {
          select: {
            files: true,
            children: true, // Count subfolders
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: skip,
      take: limitNum,
    });

    // If hierarchy is requested and we're getting root folders, build the tree
    let result = folders;
    if (includeHierarchy === "true" && parentId === null) {
      result = await buildFolderHierarchy(userId);
    }

    const totalPages = Math.ceil(totalFolders / limitNum);

    return res.status(200).json({
      success: true,
      message: "Folders fetched successfully",
      data: {
        folders: result,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalFolders,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching folders",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getFolderById = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;
    const {
      page = 1,
      limit = 50,
      sortBy = "name",
      sortOrder = "asc",
      fileType = null,
    } = req.query;

    // Validate input
    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: "Folder ID is required",
      });
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Find the folder with complete details
    const folder = await db.Folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found or you don't have permission to access it",
      });
    }

    // Build where clause for files
    const fileWhereClause = {
      folderId: folderId,
      userId: userId,
    };

    // Add file type filter if specified
    if (fileType) {
      const mimeTypeMap = {
        image: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
        ],
        document: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
        video: ["video/mp4", "video/avi", "video/mov", "video/wmv"],
        audio: ["audio/mp3", "audio/wav", "audio/ogg"],
      };

      if (mimeTypeMap[fileType]) {
        fileWhereClause.mimeType = { in: mimeTypeMap[fileType] };
      }
    }

    // Get total counts for pagination
    const totalFiles = await db.File.count({ where: fileWhereClause });
    const totalSubfolders = await db.Folder.count({
      where: {
        parentId: folderId,
        userId: userId,
      },
    });

    // Get files in the folder with pagination
    const files = await db.File.findMany({
      where: fileWhereClause,
      select: {
        id: true,
        name: true,
        originalName: true,
        size: true,
        mimeType: true,
        cloudinaryUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: skip,
      take: limitNum,
    });

    // Get subfolders in the folder
    const subfolders = await db.Folder.findMany({
      where: {
        parentId: folderId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Build breadcrumb path
    const breadcrumbs = await buildBreadcrumbPath(folderId, userId);

    // Calculate folder summary
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    // Calculate pagination metadata for files
    const totalFilePages = Math.ceil(totalFiles / limitNum);

    return res.status(200).json({
      success: true,
      message: "Folder details fetched successfully",
      data: {
        folder: {
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
          parent: folder.parent,
        },
        contents: {
          files: files,
          subfolders: subfolders.map((subfolder) => ({
            ...subfolder,
            fileCount: subfolder._count.files,
            subfolderCount: subfolder._count.children,
          })),
        },
        breadcrumbs: breadcrumbs,
        summary: {
          totalFiles: folder._count.files,
          totalSubfolders: folder._count.children,
          currentPageFiles: files.length,
          totalSize: totalSize,
        },
        pagination: {
          currentPage: pageNum,
          totalPages: totalFilePages,
          totalFiles: totalFiles,
          limit: limitNum,
          hasNextPage: pageNum < totalFilePages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching folder details:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching folder details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const { folderId } = req.params;
    const userId = req.user.id;

    // Validate input
    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: "Folder ID is required",
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Folder name cannot be empty",
      });
    }

    const trimmedName = name.trim();

    // Validate folder name format
    if (trimmedName.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Folder name too long (max 255 characters)",
      });
    }

    // Check for invalid characters (optional)
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        message: "Folder name contains invalid characters",
      });
    }

    // Find the existing folder
    const existingFolder = await db.Folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        userId: true,
      },
    });

    if (!existingFolder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found or you don't have permission to modify it",
      });
    }

    // Check if the name is actually changing
    if (existingFolder.name === trimmedName) {
      return res.status(200).json({
        success: true,
        message: "Folder name is already up to date",
        data: existingFolder,
      });
    }

    // Check for name conflicts in the same parent folder
    const nameConflict = await db.Folder.findFirst({
      where: {
        name: trimmedName,
        parentId: existingFolder.parentId, // Same parent folder
        userId: userId,
        id: {
          not: folderId, // Exclude current folder
        },
      },
    });

    if (nameConflict) {
      return res.status(409).json({
        success: false,
        message: "A folder with this name already exists in this location",
      });
    }

    // Update the folder
    const updatedFolder = await db.Folder.update({
      where: {
        id: folderId,
      },
      data: {
        name: trimmedName,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Folder renamed successfully",
      data: updatedFolder,
    });
  } catch (error) {
    console.error("Error updating folder:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating folder",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;
    const { force = false } = req.query; // Allow force delete of non-empty folders

    // Validate input
    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: "Folder ID is required",
      });
    }

    // Find the folder and check ownership
    const folder = await db.Folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found or you don't have permission to delete it",
      });
    }

    // Check if folder is empty
    const hasFiles = folder._count.files > 0;
    const hasSubfolders = folder._count.children > 0;
    const isNotEmpty = hasFiles || hasSubfolders;

    if (isNotEmpty && !force) {
      return res.status(409).json({
        success: false,
        message:
          "Folder is not empty. Use force=true to delete folder with contents",
        details: {
          fileCount: folder._count.files,
          subfolderCount: folder._count.children,
        },
      });
    }

    // Perform cascade deletion if forced or folder is empty
    let deletionSummary = {
      foldersDeleted: 0,
      filesDeleted: 0,
      cloudinaryDeletions: 0,
    };

    if (isNotEmpty && force) {
      deletionSummary = await cascadeDeleteFolder(folderId, userId);
    }

    // Delete the main folder
    await db.Folder.delete({
      where: {
        id: folderId,
      },
    });

    deletionSummary.foldersDeleted += 1;

    return res.status(200).json({
      success: true,
      message: "Folder deleted successfully",
      data: {
        deletedFolder: {
          id: folder.id,
          name: folder.name,
        },
        summary: deletionSummary,
      },
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting folder",
      error,
    });
  }
};

// Helper function for cascade deletion

export const moveFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { targetParentId } = req.body; // null for root, folder-uuid for specific parent
    const userId = req.user.id;

    // Validate input
    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: "Folder ID is required",
      });
    }

    // Find the source folder
    const sourceFolder = await db.Folder.findFirst({
      where: {
        id: folderId,
        userId: userId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        userId: true,
      },
    });

    if (!sourceFolder) {
      return res.status(404).json({
        success: false,
        message:
          "Source folder not found or you don't have permission to move it",
      });
    }

    // Check if already in target location
    if (sourceFolder.parentId === (targetParentId || null)) {
      return res.status(200).json({
        success: true,
        message: "Folder is already in the target location",
        data: sourceFolder,
      });
    }

    // Validate target parent folder (if provided)
    if (targetParentId) {
      const targetParent = await db.Folder.findFirst({
        where: {
          id: targetParentId,
          userId: userId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!targetParent) {
        return res.status(404).json({
          success: false,
          message: "Target parent folder not found",
        });
      }

      // Prevent moving folder into itself or its descendants
      const isCircularMove = await checkCircularReference(
        folderId,
        targetParentId,
        userId
      );
      if (isCircularMove) {
        return res.status(400).json({
          success: false,
          message: "Cannot move folder into itself or its subfolder",
        });
      }
    }

    // Check for name conflicts in target location
    const nameConflict = await db.Folder.findFirst({
      where: {
        name: sourceFolder.name,
        parentId: targetParentId || null,
        userId: userId,
        id: {
          not: folderId, // Exclude the folder being moved
        },
      },
    });

    if (nameConflict) {
      return res.status(409).json({
        success: false,
        message:
          "A folder with this name already exists in the target location",
        conflictingFolder: {
          id: nameConflict.id,
          name: nameConflict.name,
        },
      });
    }

    // Calculate folder depth to prevent excessive nesting (optional)
    const newDepth = await calculateFolderDepth(targetParentId, userId);
    const maxDepth = 10; // Set reasonable limit

    if (newDepth >= maxDepth) {
      return res.status(400).json({
        success: false,
        message: `Maximum folder depth (${maxDepth}) would be exceeded`,
      });
    }

    // Move the folder
    const movedFolder = await db.Folder.update({
      where: {
        id: folderId,
      },
      data: {
        parentId: targetParentId || null,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Folder moved successfully",
      data: {
        folder: movedFolder,
        moveDetails: {
          from: sourceFolder.parentId,
          to: targetParentId || null,
          newDepth: newDepth,
        },
      },
    });
  } catch (error) {
    console.error("Error moving folder:", error);
    return res.status(500).json({
      success: false,
      message: "Error moving folder",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
