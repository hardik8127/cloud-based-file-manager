import { deleteFromCloudinary } from "../configs/cloudinary.js";
import { db } from "../configs/db.js";

export const buildFolderHierarchy = async (userId) => {
  try {
    // Get all folders for the user
    const allFolders = await db.Folder.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            files: true,
            children: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Build hierarchy tree
    const folderMap = new Map();
    const rootFolders = [];

    // First pass: create map of all folders
    allFolders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build the tree structure
    allFolders.forEach((folder) => {
      if (folder.parentId === null) {
        // Root folder
        rootFolders.push(folderMap.get(folder.id));
      } else {
        // Child folder - add to parent's children array
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(folderMap.get(folder.id));
        }
      }
    });

    return rootFolders;
  } catch (error) {
    console.error("Error building folder hierarchy:", error);
    throw error;
  }
};

export const buildBreadcrumbPath = async (folderId, userId) => {
  try {
    const breadcrumbs = [];
    let currentFolderId = folderId;

    // Start from the target folder and work backwards to root
    while (currentFolderId) {
      const folder = await db.Folder.findFirst({
        where: {
          id: currentFolderId,
          userId: userId,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      });

      if (!folder) break;

      // Add to the beginning of the array
      breadcrumbs.unshift({
        id: folder.id,
        name: folder.name,
      });

      currentFolderId = folder.parentId;
    }

    // Add root folder at the beginning
    breadcrumbs.unshift({
      id: null,
      name: "Root",
    });

    return breadcrumbs;
  } catch (error) {
    console.error("Error building breadcrumb path:", error);
    return [{ id: null, name: "Root" }];
  }
};

export const cascadeDeleteFolder = async (folderId, userId) => {
  try {
    let summary = {
      foldersDeleted: 0,
      filesDeleted: 0,
      cloudinaryDeletions: 0,
    };

    // Get all files in this folder
    const files = await db.File.findMany({
      where: {
        folderId: folderId,
        userId: userId,
      },
      select: {
        id: true,
        cloudinaryId: true,
      },
    });

    // Delete files from Cloudinary and database
    for (const file of files) {
      try {
        await deleteFromCloudinary(file.cloudinaryId);
        summary.cloudinaryDeletions += 1;
      } catch (cloudinaryError) {
        console.error(
          `Failed to delete file ${file.id} from Cloudinary:`,
          cloudinaryError
        );
        // Continue with database deletion even if Cloudinary fails
      }

      await db.File.delete({
        where: { id: file.id },
      });
      summary.filesDeleted += 1;
    }

    // Get all subfolders
    const subfolders = await db.Folder.findMany({
      where: {
        parentId: folderId,
        userId: userId,
      },
      select: {
        id: true,
      },
    });

    // Recursively delete subfolders
    for (const subfolder of subfolders) {
      const subSummary = await cascadeDeleteFolder(subfolder.id, userId);
      summary.foldersDeleted += subSummary.foldersDeleted;
      summary.filesDeleted += subSummary.filesDeleted;
      summary.cloudinaryDeletions += subSummary.cloudinaryDeletions;
    }

    // Delete all subfolders (they should be empty now)
    await db.Folder.deleteMany({
      where: {
        parentId: folderId,
        userId: userId,
      },
    });

    summary.foldersDeleted += subfolders.length;

    return summary;
  } catch (error) {
    console.error("Error in cascade delete:", error);
    throw error;
  }
};

// Helper function to check for circular references
export const checkCircularReference = async (folderId, targetParentId, userId) => {
  try {
    let currentParentId = targetParentId;

    // Traverse up the parent chain
    while (currentParentId) {
      // If we find the source folder in the parent chain, it's circular
      if (currentParentId === folderId) {
        return true;
      }

      const parent = await db.Folder.findFirst({
        where: {
          id: currentParentId,
          userId: userId,
        },
        select: {
          parentId: true,
        },
      });

      if (!parent) break;
      currentParentId = parent.parentId;
    }

    return false;
  } catch (error) {
    console.error("Error checking circular reference:", error);
    return true; // Err on the side of caution
  }
};

// Helper function to calculate folder depth
export const calculateFolderDepth = async (folderId, userId) => {
  try {
    if (!folderId) return 0; // Root level

    let depth = 0;
    let currentId = folderId;

    while (currentId) {
      depth++;
      const folder = await db.Folder.findFirst({
        where: {
          id: currentId,
          userId: userId,
        },
        select: {
          parentId: true,
        },
      });

      if (!folder) break;
      currentId = folder.parentId;
    }

    return depth;
  } catch (error) {
    console.error("Error calculating folder depth:", error);
    return 0;
  }
};
