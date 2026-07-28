// features/zip/collision-detector.js
// Claude Sonnet 5 | session 3 refactor | 2026-07-28

if (typeof window.FiboCollisionDetector === 'undefined') {
  window.FiboCollisionDetector = class FiboCollisionDetector {
    async checkFileExists(rootHandle, parts, fileName) {
      try {
        let currentDirHandle = rootHandle;
        for (const folderName of parts) {
          currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: false });
        }
        await currentDirHandle.getFileHandle(fileName, { create: false });
        return true;
      } catch (e) {
        return false;
      }
    }
  };
}
