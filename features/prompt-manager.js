// features/prompt-manager.js
// Claude Sonnet 5 | 01-08-new features | 2026-08-02
// feature: phase4-prompt-import-export

if (typeof window.FiboPromptManager === 'undefined') {
  window.FiboPromptManager = class FiboPromptManager {
    constructor(eventBus) {
      this.bus = eventBus;
      this.prompts = [];
      this.STORAGE_KEY = 'fzfd_prompts_data';
    }

    async init() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([this.STORAGE_KEY], (result) => {
            if (result && result[this.STORAGE_KEY]) {
              this.prompts = result[this.STORAGE_KEY];
              resolve(this.prompts);
            } else {
              this.prompts = this.getDefaultPrompts();
              this.save().then(() => resolve(this.prompts));
            }
          });
          this.bindStorageSync();
        } else {
          const local = localStorage.getItem(this.STORAGE_KEY);
          if (local) {
            try {
              this.prompts = JSON.parse(local);
              resolve(this.prompts);
            } catch (e) {
              this.prompts = this.getDefaultPrompts();
              this.save().then(() => resolve(this.prompts));
            }
          } else {
            this.prompts = this.getDefaultPrompts();
            this.save().then(() => resolve(this.prompts));
          }
          this.bindWindowStorageSync();
        }
      });
    }

    // chrome.storage.onChanged fires in every context running this content script,
    // including the tab that made the write itself — the equality check is what
    // tells a real cross-tab change apart from an echo of our own save().
    bindStorageSync() {
      if (!chrome.storage.onChanged) return;
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes[this.STORAGE_KEY]) return;
        const incoming = changes[this.STORAGE_KEY].newValue || [];
        if (JSON.stringify(incoming) === JSON.stringify(this.prompts)) return;
        this.prompts = incoming;
        if (this.bus) this.bus.publish({ type: 'PROMPTS_UPDATED', payload: this.prompts });
      });
    }

    // Fallback for non-extension/localStorage contexts. The 'storage' event only
    // ever fires on OTHER tabs/windows of the same origin, never the writer itself,
    // so no echo-suppression is needed here.
    bindWindowStorageSync() {
      if (typeof window === 'undefined' || !window.addEventListener) return;
      window.addEventListener('storage', (e) => {
        if (e.key !== this.STORAGE_KEY || !e.newValue) return;
        try {
          this.prompts = JSON.parse(e.newValue);
          if (this.bus) this.bus.publish({ type: 'PROMPTS_UPDATED', payload: this.prompts });
        } catch (err) {
          console.error('Fibo Prompt Sync Parse Error:', err);
        }
      });
    }

    getDefaultPrompts() {
      return [
        {
          id: 'p_default_1',
          name: 'FZFD 3-Line Header Directive',
          content: 'Please precede every generated code file with the 3-line header format:\n// relative/path/to/file.ext\n// Model | Chat Session Name | YYYY-MM-DD\n// feature: feature-id-here',
          isFavorite: true,
          createdAt: new Date().toISOString(),
          variants: [
            {
              id: 'v_default_1',
              name: 'MV3 Strict Checklist Append',
              type: 'append',
              addition: '\nEnsure zero import/export statements in content scripts and render all UI strictly inside closed Shadow DOM.',
              isFavorite: false
            }
          ]
        }
      ];
    }

    async save() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [this.STORAGE_KEY]: this.prompts }, () => resolve());
        } else {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.prompts));
          resolve();
        }
      });
    }

    getPrompts() {
      return this.prompts;
    }

    async addPrompt(name, content) {
      const newPrompt = {
        id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim() || 'Untitled Prompt',
        content: content.trim(),
        isFavorite: false,
        createdAt: new Date().toISOString(),
        variants: []
      };
      this.prompts.unshift(newPrompt);
      await this.save();
      return newPrompt;
    }

    async updatePrompt(id, name, content) {
      const prompt = this.prompts.find((p) => p.id === id);
      if (prompt) {
        prompt.name = name.trim();
        prompt.content = content.trim();
        await this.save();
      }
    }

    async deletePrompt(id) {
      this.prompts = this.prompts.filter((p) => p.id !== id);
      await this.save();
    }

    async toggleFavorite(id) {
      const prompt = this.prompts.find((p) => p.id === id);
      if (prompt) {
        prompt.isFavorite = !prompt.isFavorite;
        await this.save();
      }
    }

    async addVariant(promptId, name, type, payload) {
      const prompt = this.prompts.find((p) => p.id === promptId);
      if (!prompt) return null;

      const newVariant = {
        id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim() || 'Untitled Variant',
        type: type,
        isFavorite: false,
        createdAt: new Date().toISOString()
      };

      if (type === 'append') {
        newVariant.addition = payload.addition ? payload.addition.trim() : '';
      } else {
        newVariant.content = payload.content ? payload.content.trim() : prompt.content;
      }

      if (!prompt.variants) prompt.variants = [];
      prompt.variants.push(newVariant);
      await this.save();
      return newVariant;
    }

    async updateVariant(promptId, variantId, name, payload) {
      const prompt = this.prompts.find((p) => p.id === promptId);
      if (!prompt || !prompt.variants) return;
      const variant = prompt.variants.find((v) => v.id === variantId);
      if (!variant) return;

      variant.name = name.trim();
      if (variant.type === 'append') {
        if (payload && typeof payload.addition === 'string' && payload.addition.trim()) {
          variant.addition = payload.addition.trim();
        }
      } else {
        if (payload && typeof payload.content === 'string' && payload.content.trim()) {
          variant.content = payload.content.trim();
        }
      }
      await this.save();
    }

    async deleteVariant(promptId, variantId) {
      const prompt = this.prompts.find((p) => p.id === promptId);
      if (prompt && prompt.variants) {
        prompt.variants = prompt.variants.filter((v) => v.id !== variantId);
        await this.save();
      }
    }

    async toggleVariantFavorite(promptId, variantId) {
      const prompt = this.prompts.find((p) => p.id === promptId);
      if (prompt && prompt.variants) {
        const variant = prompt.variants.find((v) => v.id === variantId);
        if (variant) {
          variant.isFavorite = !variant.isFavorite;
          await this.save();
        }
      }
    }

    // Returns the resolved text, or null if the user cancelled a required
    // {{feature}} prompt — callers must treat null as "abort the copy," not as
    // an empty string, so a cancelled fill-in never silently copies partial text.
    getComputedText(prompt, variant = null) {
      let raw = prompt.content;
      if (variant) {
        if (variant.type === 'edit') raw = variant.content;
        else if (variant.type === 'append') raw = `${prompt.content}\n\n${variant.addition || ''}`;
      }
      return this.resolvePlaceholders(raw);
    }

    resolvePlaceholders(text) {
      if (typeof text !== 'string' || text.indexOf('{{') === -1) return text;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      let result = text.split('{{date}}').join(dateStr).split('{{time}}').join(timeStr);

      if (result.includes('{{feature}}')) {
        const featureValue = window.prompt('Fill in {{feature}}:', '');
        if (featureValue === null) return null;
        result = result.split('{{feature}}').join(featureValue);
      }

      return result;
    }

    exportPromptsJson() {
      return JSON.stringify(this.prompts, null, 2);
    }

    validateImportedPrompts(parsed) {
      if (!Array.isArray(parsed)) {
        throw new Error('Import file must contain a JSON array of prompts.');
      }
      parsed.forEach((p, i) => {
        if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.content !== 'string') {
          throw new Error(`Prompt at index ${i} is missing required fields (id, name, content).`);
        }
      });
    }

    // conflictResolver(existingPrompt, incomingPrompt) is called once per ID
    // collision with different content, and must resolve to 'skip' | 'overwrite'
    // | 'skip-all' | 'overwrite-all'. Once a '*-all' choice is made it's reused
    // for every remaining conflict without asking again.
    async importPromptsJson(jsonStr, conflictResolver) {
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error('Import file is not valid JSON.');
      }
      this.validateImportedPrompts(parsed);

      let bulkDecision = null;
      let imported = 0, overwritten = 0, skipped = 0;

      for (const incoming of parsed) {
        const existingIndex = this.prompts.findIndex((p) => p.id === incoming.id);

        if (existingIndex === -1) {
          this.prompts.push(incoming);
          imported++;
          continue;
        }

        const existing = this.prompts[existingIndex];
        if (JSON.stringify(existing) === JSON.stringify(incoming)) {
          continue;
        }

        let decision = bulkDecision;
        if (!decision) {
          decision = conflictResolver ? await conflictResolver(existing, incoming) : 'skip';
          if (decision === 'skip-all' || decision === 'overwrite-all') bulkDecision = decision;
        }

        const effective = decision === 'overwrite-all' ? 'overwrite' : decision === 'skip-all' ? 'skip' : decision;

        if (effective === 'overwrite') {
          this.prompts[existingIndex] = incoming;
          overwritten++;
        } else {
          skipped++;
        }
      }

      await this.save();
      return { imported, overwritten, skipped };
    }
  };
}

// Legacy alias — preserved for backwards compatibility.
window.PromptManager = window.FiboPromptManager;