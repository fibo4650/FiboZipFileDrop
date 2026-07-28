// features/zip/log-writer.js
// Claude Sonnet 5 | session 3 refactor | 2026-07-28

if (typeof window.FiboLogWriter === 'undefined') {
  window.FiboLogWriter = class FiboLogWriter {
    async getRotatedLogHandle(logDirHandle, year, month) {
      const baseName = `fzfd-${year}-${month}`;
      const MAX_BYTES = 1024 * 1024;
      let index = 1;

      while (true) {
        const fileName = index === 1 ? `${baseName}.log` : `${baseName}-part${index}.log`;
        const logFileHandle = await logDirHandle.getFileHandle(fileName, { create: true });
        const file = await logFileHandle.getFile();

        if (file.size < MAX_BYTES) {
          return { logFileHandle, fileSize: file.size };
        }

        index++;
      }
    }

    async writeAutoLog(rootHandle, logs, successCount, failCount, line2Header, line3Header) {
      try {
        const logDirHandle = await rootHandle.getDirectoryHandle('FZFDlog', { create: true });

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const { logFileHandle, fileSize } = await this.getRotatedLogHandle(logDirHandle, year, month);

        const timestamp = now.toISOString();
        const headerLine1 = `[TIMESTAMP: ${timestamp}] | SUCCESS: ${successCount} | FAILED: ${failCount}`;
        const headerLine2 = `[STAMP LINE 2]: ${line2Header || 'N/A'}`;
        const headerLine3 = line3Header ? `[STAMP LINE 3 / FEATURE]: ${line3Header}\n` : '';

        let logBlock = `${headerLine1}\n${headerLine2}\n${headerLine3}`;
        logs.forEach(l => {
          logBlock += `  - [${l.status}] ${l.path}${l.error ? ` (Error: ${l.error})` : ''}\n`;
        });
        logBlock += `--------------------------------------------------------------------------------\n`;

        const writable = await logFileHandle.createWritable({ keepExistingData: true });
        try {
          await writable.seek(fileSize);
          await writable.write(logBlock);
        } finally {
          await writable.close();
        }
      } catch (logErr) {
        console.error("FZFD Auto-Logging Error:", logErr);
      }
    }

    async writeEventJson(rootHandle, logs, secondLine, thirdLine, headerParser) {
      try {
        const eventsDirHandle = await rootHandle.getDirectoryHandle('events', { create: true });

        const now = new Date();
        const isoTimestamp = now.toISOString();
        const compactStamp = isoTimestamp.replace(/[:\-.]/g, '');
        const fileName = `extension-${compactStamp}.json`;

        const line2Info = headerParser.parseLine2Info(secondLine);
        const globalFeature = headerParser.parseFeatureInfo(thirdLine);

        const filesPayload = logs.map(l => {
          const featureName = l.feature || globalFeature;
          const entry = {
            path: l.path,
            status: l.status === 'SUCCESS' ? 'success' : 'error',
            change_type: l.changeType || 'updated'
          };
          if (featureName) {
            entry.expects = { feature: featureName };
          }
          return entry;
        });

        const batchPayload = {
          timestamp: isoTimestamp,
          date: line2Info.date,
          model: line2Info.model,
          chat_name: line2Info.chatName,
          source: 'extension',
          files: filesPayload
        };

        const eventFileHandle = await eventsDirHandle.getFileHandle(fileName, { create: true });
        const writable = await eventFileHandle.createWritable();
        try {
          await writable.write(JSON.stringify(batchPayload, null, 2));
        } finally {
          await writable.close();
        }
      } catch (err) {
        console.error("FZFD Event JSON Write Error:", err);
      }
    }
  };
}
