// features/zip/rule-matcher.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

// Matching only — no storage (see features/learned-rules-store.js for that).
// Every one of marker/attrKey/itemPattern/tagName/pathAttr below is consumed
// purely via startsWith/indexOf/slice/charCodeAt — NEVER new RegExp(...). A
// maximally adversarial stored value (e.g. itemPattern: '(a+)+$') is inert, just
// a literal string comparison. This is the actual reason the rule schema is
// restricted to a closed template vocabulary: this file has no "freehand"
// branch that would ever need RegExp. Do not add one.
if (typeof window.FiboRuleMatcher === 'undefined') {
  window.FiboRuleMatcher = class FiboRuleMatcher {
    // Only rules producing >=2 blocks count as a match — a single marker found in
    // a paste is Tier 1's job, not evidence of a multi-file split.
    matchAll(text, rules) {
      const results = [];
      for (const rule of rules || []) {
        const blocks = this._runTemplate(rule.template, text);
        if (blocks.length >= 2) {
          results.push({ rule, blocks, matchCount: blocks.length });
        }
      }
      results.sort((a, b) => b.matchCount - a.matchCount);
      return results;
    }

    _runTemplate(template, text) {
      if (!template) return [];
      switch (template.type) {
        case 'line-prefix': return this.matchLinePrefix(text, template.marker);
        case 'fenced-with-attr': return this.matchFencedWithAttr(text, template.attrKey);
        case 'numbered-list': return this.matchNumberedList(text, template.itemPattern);
        case 'xml-wrapper': return this.matchXmlWrapper(text, template.tagName, template.pathAttr);
        default: return [];
      }
    }

    matchLinePrefix(text, marker) {
      if (!marker) return [];
      const lines = text.split('\n');
      const blocks = [];
      let current = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(marker)) {
          if (current) blocks.push(current);
          current = { candidatePath: trimmed.slice(marker.length).trim(), contentLines: [] };
        } else if (current) {
          current.contentLines.push(line);
        }
      }
      if (current) blocks.push(current);

      return blocks
        .map((b) => ({ candidatePath: b.candidatePath, content: b.contentLines.join('\n').trim() }))
        .filter((b) => b.candidatePath);
    }

    matchFencedWithAttr(text, attrKey) {
      if (!attrKey) return [];
      const lines = text.split('\n');
      const blocks = [];
      let i = 0;

      while (i < lines.length) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('```')) {
          let markerLen = 0;
          while (markerLen < trimmed.length && trimmed[markerLen] === '`') markerLen++;
          const marker = trimmed.slice(0, markerLen);
          const candidatePath = this._extractAttrValue(trimmed.slice(markerLen), attrKey);

          const contentLines = [];
          let j = i + 1;
          let closed = false;
          while (j < lines.length) {
            if (lines[j].trim() === marker) { closed = true; break; }
            contentLines.push(lines[j]);
            j++;
          }
          if (candidatePath && closed) {
            blocks.push({ candidatePath, content: contentLines.join('\n').trim() });
          }
          i = closed ? j + 1 : lines.length; // unclosed fence — stop scanning, malformed input
        } else {
          i++;
        }
      }
      return blocks;
    }

    matchNumberedList(text, itemPattern) {
      if (!itemPattern) return [];
      const lines = text.split('\n');
      const blocks = [];
      let current = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(itemPattern)) {
          const rest = trimmed.slice(itemPattern.length);
          const firstCharCode = rest.charCodeAt(0);
          if (firstCharCode >= 48 && firstCharCode <= 57) {
            if (current) blocks.push(current);
            current = { candidatePath: this._stripNumberPrefix(rest), contentLines: [] };
            continue;
          }
        }
        if (current) current.contentLines.push(line);
      }
      if (current) blocks.push(current);

      return blocks
        .map((b) => ({ candidatePath: b.candidatePath, content: b.contentLines.join('\n').trim() }))
        .filter((b) => b.candidatePath);
    }

    matchXmlWrapper(text, tagName, pathAttr) {
      if (!tagName || !pathAttr) return [];
      const openPrefix = `<${tagName}`;
      const closeTag = `</${tagName}>`;
      const lines = text.split('\n');
      const blocks = [];
      let i = 0;

      while (i < lines.length) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith(openPrefix)) {
          const closeBracket = trimmed.indexOf('>');
          const attrString = closeBracket === -1 ? trimmed : trimmed.slice(0, closeBracket);
          const candidatePath = this._extractAttrValue(attrString, pathAttr);

          const contentLines = [];
          let j = i + 1;
          let closed = false;
          while (j < lines.length) {
            if (lines[j].trim() === closeTag) { closed = true; break; }
            contentLines.push(lines[j]);
            j++;
          }
          if (candidatePath && closed) {
            blocks.push({ candidatePath, content: contentLines.join('\n').trim() });
          }
          i = closed ? j + 1 : lines.length;
        } else {
          i++;
        }
      }
      return blocks;
    }

    // Shared by fenced-with-attr and xml-wrapper. Handles key="value", key='value',
    // and bare key=value/key:value, all via indexOf/slice — no regex.
    _extractAttrValue(source, key) {
      for (const sep of ['=', ':']) {
        const marker = `${key}${sep}`;
        const idx = source.indexOf(marker);
        if (idx === -1) continue;

        const rest = source.slice(idx + marker.length);
        if (rest[0] === '"' || rest[0] === "'") {
          const quote = rest[0];
          const end = rest.indexOf(quote, 1);
          return end === -1 ? null : (rest.slice(1, end).trim() || null);
        }

        let end = rest.length;
        for (const stopChar of [' ', '>', '\t']) {
          const stopIdx = rest.indexOf(stopChar);
          if (stopIdx !== -1 && stopIdx < end) end = stopIdx;
        }
        const value = rest.slice(0, end).trim();
        return value || null;
      }
      return null;
    }

    _stripNumberPrefix(rest) {
      let i = 0;
      while (i < rest.length && rest.charCodeAt(i) >= 48 && rest.charCodeAt(i) <= 57) i++;
      const separators = [':', ')', '.', '-'];
      if (i < rest.length && separators.includes(rest[i])) i++;
      return rest.slice(i).trim();
    }
  };
}
