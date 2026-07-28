// features/zip/file-writer.js
// Claude Sonnet 5 | session 3 refactor | 2026-07-28

if (typeof window.FiboFileWriter === 'undefined') {
  window.FiboFileWriter = class FiboFileWriter {
    async writeStagedFile(rootHandle, fileData, userChangeType, headerParser) {
      let currentDirHandle = rootHandle;
      for (const folderName of fileData.parts) {
        currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: true });
      }

      if (userChangeType === 'deleted') {
        await currentDirHandle.removeEntry(fileData.fileName);
        return { deleted: true, feature: null, slots: null };
      }

      let finalContent = fileData.content;

      if ((userChangeType === 'appended' || userChangeType === 'prepended') && !fileData.isBinary) {
        let existingText = '';
        try {
          const existingHandle = await currentDirHandle.getFileHandle(fileData.fileName, { create: false });
          const fileObj = await existingHandle.getFile();
          existingText = await fileObj.text();
        } catch (e) {
          existingText = '';
        }

        finalContent = headerParser.combineHeaderAndContent(fileData.content, existingText, userChangeType);
      }

      const fileHandle = await currentDirHandle.getFileHandle(fileData.fileName, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(finalContent);
      } finally {
        await writable.close();
      }

      let feature = null;
      let slots = null;

      if (!fileData.isBinary) {
        const extracted = headerParser.extractHeaderAndBody(finalContent);
        slots = extracted.slots;
        if (slots.line3) {
          feature = headerParser.parseFeatureInfo(slots.line3);
        }
      }

      return { deleted: false, feature, slots };
    }
  };
}
