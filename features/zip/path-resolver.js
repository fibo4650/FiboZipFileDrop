// features/zip/path-resolver.js
// Claude Sonnet 5 | session 3 refactor | 2026-07-28

if (typeof window.FiboPathResolver === 'undefined') {
  window.FiboPathResolver = class FiboPathResolver {
    constructor() {
      this.BINARY_EXTENSIONS = new Set([
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico',
        'woff', 'woff2', 'ttf', 'otf', 'eot',
        'pdf', 'zip', 'tar', 'gz', 'mp3', 'mp4', 'wav', 'exe',
        'dll', 'so', 'dylib', 'class', 'pyc', 'db', 'sqlite'
      ]);
    }

    isBinary(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      return this.BINARY_EXTENSIONS.has(ext);
    }

    parseTargetInfo(firstLine, rawFileName) {
      let displayPath = rawFileName;
      let parts = [];
      let hasExplicitComment = false;

      if (firstLine) {
        const trimmed = firstLine.replace(/^\uFEFF/, '').trim();
        const commentRegex = /^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/;
        const match = trimmed.match(commentRegex);

        if (match) {
          let candidate = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
          const validExtensionEnd = /\.[a-zA-Z0-9]{1,10}$/;

          if (candidate && !candidate.includes('://') && validExtensionEnd.test(candidate)) {
            const sanitized = candidate.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/').replace(/\/+/g, '/');
            const pathParts = sanitized.split('/').filter(p => p && p !== '.');

            if (pathParts.includes('..')) {
              throw new Error(`Forbidden parent directory reference ('..') in path header: '${candidate}'`);
            }

            if (pathParts.length > 0) {
              const fileName = pathParts.pop();

              if (validExtensionEnd.test(fileName)) {
                displayPath = sanitized;
                parts = pathParts;
                hasExplicitComment = true;
                return { fileName, displayPath, parts, hasExplicitComment };
              }
            }
          }
        }
      }

      return { fileName: rawFileName, displayPath, parts, hasExplicitComment };
    }

    resolveFallbackPath(rawPath, subjectLabel) {
      const normalizedPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
      const pathParts = normalizedPath.split('/').filter(p => p && p !== '.');

      if (pathParts.includes('..')) {
        throw new Error(`${subjectLabel} contains forbidden parent directory reference ('..'): '${rawPath}'`);
      }

      if (pathParts.length === 0) return null;

      const fileName = pathParts.pop();
      return { fileName, parts: pathParts, displayPath: normalizedPath };
    }

    resolveExplicitPath(newDisplayPath) {
      const sanitized = newDisplayPath.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/').replace(/\/+/g, '/');
      const pathParts = sanitized.split('/').filter(p => p && p !== '.');

      if (pathParts.includes('..')) {
        throw new Error(`Forbidden parent directory reference ('..') in path: '${newDisplayPath}'`);
      }

      if (pathParts.length === 0) {
        throw new Error(`Path cannot be empty.`);
      }

      const fileName = pathParts.pop();
      return { fileName, parts: pathParts, displayPath: sanitized };
    }
  };
}
