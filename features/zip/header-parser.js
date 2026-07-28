// features/zip/header-parser.js
// Claude Sonnet 5 | session 3 refactor | 2026-07-28

if (typeof window.FiboHeaderParser === 'undefined') {
  window.FiboHeaderParser = class FiboHeaderParser {
    isPathHeaderLine(line) {
      if (typeof line !== 'string') return false;
      const trimmed = line.replace(/^\uFEFF/, '').trim();
      const match = trimmed.match(/^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/);
      if (!match) return false;
      const inner = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
      const validExtensionEnd = /\.[a-zA-Z0-9]{1,10}$/;
      if (!inner || inner.includes('://') || !validExtensionEnd.test(inner)) return false;
      const sanitized = inner.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/').replace(/\/+/g, '/');
      const parts = sanitized.split('/').filter(p => p && p !== '.');
      return !parts.includes('..') && parts.length > 0;
    }

    isStampHeaderLine(line) {
      if (typeof line !== 'string') return false;
      const trimmed = line.replace(/^\uFEFF/, '').trim();
      const match = trimmed.match(/^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/);
      if (!match) return false;
      const inner = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
      const firstPipe = inner.indexOf('|');
      const lastPipe = inner.lastIndexOf('|');
      return firstPipe !== -1 && lastPipe !== -1 && firstPipe < lastPipe;
    }

    isFeatureHeaderLine(line) {
      if (typeof line !== 'string') return false;
      const trimmed = line.replace(/^\uFEFF/, '').trim();
      const match = trimmed.match(/^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/);
      if (!match) return false;
      const inner = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
      return /^feature:\s*(.+)$/i.test(inner);
    }

    extractHeaderAndBody(textContent) {
      if (typeof textContent !== 'string') {
        return { slots: { line1: null, line2: null, line3: null }, body: '' };
      }

      const lines = textContent.split('\n');
      const slots = { line1: null, line2: null, line3: null };
      let bodyStartIndex = 0;

      if (lines.length > 0 && this.isPathHeaderLine(lines[0])) {
        slots.line1 = lines[0];
        bodyStartIndex = 1;

        for (let i = 1; i < Math.min(3, lines.length); i++) {
          const line = lines[i];
          if (this.isStampHeaderLine(line)) {
            if (!slots.line2) {
              slots.line2 = line;
              bodyStartIndex = i + 1;
            } else {
              break;
            }
          } else if (this.isFeatureHeaderLine(line)) {
            if (!slots.line3) {
              slots.line3 = line;
              bodyStartIndex = i + 1;
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }

      const body = lines.slice(bodyStartIndex).join('\n');
      return { slots, body };
    }

    combineHeaderAndContent(addedText, diskText, mode) {
      const added = this.extractHeaderAndBody(addedText || '');
      const disk = this.extractHeaderAndBody(diskText || '');

      const mergedLine1 = added.slots.line1 || disk.slots.line1 || null;
      const mergedLine2 = added.slots.line2 || disk.slots.line2 || null;
      const mergedLine3 = added.slots.line3 || disk.slots.line3 || null;

      const mergedHeaders = [];
      if (mergedLine1) mergedHeaders.push(mergedLine1);
      if (mergedLine2) mergedHeaders.push(mergedLine2);
      if (mergedLine3) mergedHeaders.push(mergedLine3);

      const headerBlock = mergedHeaders.length > 0 ? mergedHeaders.join('\n') + '\n' : '';
      const addedBody = added.body.trim();
      const diskBody = disk.body.trim();

      let bodies = '';
      if (mode === 'appended') {
        bodies = [diskBody, addedBody].filter(Boolean).join('\n\n');
      } else {
        bodies = [addedBody, diskBody].filter(Boolean).join('\n\n');
      }

      return headerBlock + bodies + (bodies ? '\n' : '');
    }

    parseLine2Info(line2) {
      const today = new Date().toISOString().split('T')[0];
      if (!line2 || typeof line2 !== 'string') {
        return { model: 'Gemini 3.6', chatName: 'FZFD Session', date: today };
      }
      const cleaned = line2.replace(/^(?:\/\/|\/\*|#|<!--)\s*/, '').replace(/(?:\*\/|-->)$/, '').trim();
      const firstPipe = cleaned.indexOf('|');
      const lastPipe = cleaned.lastIndexOf('|');

      if (firstPipe !== -1 && lastPipe !== -1 && firstPipe < lastPipe) {
        const model = cleaned.substring(0, firstPipe).trim() || 'Gemini 3.6';
        const date = cleaned.substring(lastPipe + 1).trim() || today;
        const chatName = cleaned.substring(firstPipe + 1, lastPipe).trim() || 'FZFD Session';
        return { model, chatName, date };
      }

      return { model: 'Gemini 3.6', chatName: cleaned || 'FZFD Session', date: today };
    }

    parseFeatureInfo(line3) {
      if (!line3 || typeof line3 !== 'string') return null;
      const cleaned = line3.replace(/^(?:\/\/|\/\*|#|<!--)\s*/, '').replace(/(?:\*\/|-->)$/, '').trim();
      const match = cleaned.match(/^feature:\s*(.+)$/i);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
      return null;
    }
  };
}
