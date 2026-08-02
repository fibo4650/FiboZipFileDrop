// features/zip/path-resolver.js
// Claude Sonnet | Priority 2 & 3 Remediation | 2026-07-28

if (typeof window.FiboPathResolver === 'undefined') {
  window.FiboPathResolver = class FiboPathResolver {
    constructor(headerParser) {
      this.BINARY_EXTENSIONS = new Set([
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico',
        'woff', 'woff2', 'ttf', 'otf', 'eot',
        'pdf', 'zip', 'tar', 'gz', 'mp3', 'mp4', 'wav', 'exe',
        'dll', 'so', 'dylib', 'class', 'pyc', 'db', 'sqlite'
      ]);
      this.headerParser = headerParser || new window.FiboHeaderParser();
    }

    isBinary(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      return this.BINARY_EXTENSIONS.has(ext);
    }

    // Consolidated sanitize + split + parent-traversal check, shared by
    // parseTargetInfo and resolveExplicitPath (both fully sanitize user-facing
    // path text). resolveFallbackPath deliberately stays separate — it
    // normalizes real filesystem/zip-entry paths without stripping OS-illegal
    // characters, which was never desired there.
    sanitizePathParts(rawPath) {
      const sanitized = rawPath.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/').replace(/\/+/g, '/');
      const parts = sanitized.split('/').filter(p => p && p !== '.');
      return { sanitized, parts, hasParentTraversal: parts.includes('..') };
    }

    parseTargetInfo(firstLine, rawFileName) {
      let displayPath = rawFileName;
      let parts = [];
      let hasExplicitComment = false;

      // Delegates the comment-regex extraction to headerParser (fixes the
      // duplicated /^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/ regex).
      // Deliberately does NOT gate on headerParser.isPathHeaderLine(firstLine):
      // that helper folds the '..' rejection into the same false it returns for
      // "not a comment at all", which would silently swallow the explicit
      // parent-traversal throw below instead of raising it.
      const candidate = firstLine ? this.headerParser.extractCommentInner(firstLine) : null;
      const validExtensionEnd = /\.[a-zA-Z0-9]{1,10}$/;

      if (candidate && !candidate.includes('://') && validExtensionEnd.test(candidate)) {
        const { sanitized, parts: pathParts, hasParentTraversal } = this.sanitizePathParts(candidate);

        if (hasParentTraversal) {
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
      const { sanitized, parts: pathParts, hasParentTraversal } = this.sanitizePathParts(newDisplayPath);

      if (hasParentTraversal) {
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
