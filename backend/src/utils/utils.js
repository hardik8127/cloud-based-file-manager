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
