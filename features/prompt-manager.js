// features/prompt-manager.js
// Gemini 3.6 Flash | Class Declaration Guard | 2026-07-28

if (typeof window.PromptManager === 'undefined') {
  window.PromptManager = class PromptManager {
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
            } else {
              this.prompts = this.getDefaultPrompts();
            }
            resolve(this.prompts);
          });
        } else {
          const local = localStorage.getItem(this.STORAGE_KEY);
          if (local) {
            try {
              this.prompts = JSON.parse(local);
            } catch (e) {
              this.prompts = this.getDefaultPrompts();
            }
          } else {
            this.prompts = this.getDefaultPrompts();
          }
          resolve(this.prompts);
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
        variant.addition = payload.addition ? payload.addition.trim() : '';
      } else {
        variant.content = payload.content ? payload.content.trim() : '';
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

    getComputedText(prompt, variant = null) {
      if (!variant) return prompt.content;
      if (variant.type === 'edit') return variant.content;
      if (variant.type === 'append') {
        return `${prompt.content}\n\n${variant.addition || ''}`;
      }
      return prompt.content;
    }
  };
}