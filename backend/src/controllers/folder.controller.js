import { db } from "../configs/db.js";
import { buildFolderHierarchy } from "../utils/utils.js";

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

    const where = { id: folderId, userId: userId };

    if (!folderId || !userId) {
      return res.status(400).json({
        message: "An error occured",
      });
    }

    const folder = await db.Folder.findFirst({ where: where });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Folder fetched successfully",
      folder,
    });
  } catch (error) {
    console.error("Error in fetching folder", error);
    res.status(500).json({
      message: "Error in fetching folder",
      error,
    });
  }
};
export const updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const { folderId } = req.params;
    const userId = req.user.id;

    const where = { id: folderId, userId: userId };
    if (!name || name.trim().length == 0) {
      return res.status(400).json({
        message: "Folder name cannot be empty",
      });
    }

    const folder = await db.Folder.findFirst({ where: where });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    const isFolderNameTaken = await db.Folder.findFirst({
      where: {
        id: folderId,
        name: folder.name,
        userId: userId,
        id: {
          not: folderId,
        },
      },
    });

    if (isFolderNameTaken) {
      return res.status(409).json({
        success: false,
        message: "Folder with this name already exists",
      });
    }

    const updatedFolder = await db.Folder.update({
      where: where,
      data: {
        name: name.trim(),
      },
    });

    return res.status(200).json({
      success: true,
      message: " Folder renamed successfully",
    });
  } catch (error) {
    console.error("Error in fetching folder", error);
    res.status(500).json({
      message: "Error in fetching folder",
      error,
    });
  }
};
export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id;
  } catch (error) {}
};
export const moveFolder = async (req, res) => {};
