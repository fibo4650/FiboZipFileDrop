// features/learned-rules-store.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

// Owns two related-but-distinct concepts because promotion between them is the
// whole point: RULES are the behavioral objects Tier 3 actually runs (features/zip/
// rule-matcher.js reads them via getEligibleRules()); OBSERVED TEMPLATES are cheap,
// invisible bookkeeping for shapes seen only once, never surfaced in the Rules
// Manager UI, that graduate into a real candidate rule on their second sighting.
if (typeof window.FiboLearnedRulesStore === 'undefined') {
  window.FiboLearnedRulesStore = class FiboLearnedRulesStore {
    constructor(eventBus) {
      this.bus = eventBus;
      this.RULES_KEY = 'fzfd_learned_rules';
      this.OBSERVATIONS_KEY = 'fzfd_observed_templates';
      this.rules = [];
      this.observations = [];
    }

    async init() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([this.RULES_KEY, this.OBSERVATIONS_KEY], async (result) => {
            this.observations = (result && result[this.OBSERVATIONS_KEY]) || [];
            if (result && result[this.RULES_KEY]) {
              this.rules = result[this.RULES_KEY];
              resolve(this.rules);
            } else {
              this.rules = this.getDefaultRules();
              await this.save();
              resolve(this.rules);
            }
          });
          this.bindStorageSync();
        } else {
          const localObs = localStorage.getItem(this.OBSERVATIONS_KEY);
          this.observations = localObs ? JSON.parse(localObs) : [];
          const localRules = localStorage.getItem(this.RULES_KEY);
          if (localRules) {
            try { this.rules = JSON.parse(localRules); } catch (e) { this.rules = this.getDefaultRules(); }
          } else {
            this.rules = this.getDefaultRules();
          }
          this.save().then(() => resolve(this.rules));
          this.bindWindowStorageSync();
        }
      });
    }

    bindStorageSync() {
      if (!chrome.storage.onChanged) return;
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (changes[this.RULES_KEY]) {
          const incoming = changes[this.RULES_KEY].newValue || [];
          if (JSON.stringify(incoming) !== JSON.stringify(this.rules)) {
            this.rules = incoming;
            if (this.bus) this.bus.publish({ type: 'LEARNED_RULES_UPDATED', payload: this.rules });
          }
        }
        if (changes[this.OBSERVATIONS_KEY]) {
          this.observations = changes[this.OBSERVATIONS_KEY].newValue || [];
        }
      });
    }

    bindWindowStorageSync() {
      if (typeof window === 'undefined' || !window.addEventListener) return;
      window.addEventListener('storage', (e) => {
        if (e.key === this.RULES_KEY && e.newValue) {
          try {
            this.rules = JSON.parse(e.newValue);
            if (this.bus) this.bus.publish({ type: 'LEARNED_RULES_UPDATED', payload: this.rules });
          } catch (err) { console.error('Fibo Learned Rules Sync Parse Error:', err); }
        }
        if (e.key === this.OBSERVATIONS_KEY && e.newValue) {
          try { this.observations = JSON.parse(e.newValue); } catch (err) { /* ignore */ }
        }
      });
    }

    getDefaultRules() {
      const now = new Date().toISOString();
      return [
        {
          id: 'rule_seed_1',
          name: '"File:" Line Prefix (Seed)',
          kind: 'template',
          template: { type: 'line-prefix', marker: 'File:' },
          sampleText: 'File: src/App.jsx\nexport default function App() {\n  return <div>Hello</div>;\n}\n\nFile: src/index.js\nimport App from \'./App\';\n',
          matchCount: 0,
          rejectedCount: 0,
          createdAt: now,
          lastVerifiedAt: null,
          status: 'native',
          source: 'seed'
        },
        {
          id: 'rule_seed_2',
          name: 'Numbered "File #" List (Seed)',
          kind: 'template',
          template: { type: 'numbered-list', itemPattern: 'File #' },
          sampleText: 'File #1: src/App.jsx\nexport default function App() {}\n\nFile #2: src/index.js\nimport App from \'./App\';\n',
          matchCount: 0,
          rejectedCount: 0,
          createdAt: now,
          lastVerifiedAt: null,
          status: 'native',
          source: 'seed'
        }
      ];
    }

    async save() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [this.RULES_KEY]: this.rules }, () => resolve());
        } else {
          localStorage.setItem(this.RULES_KEY, JSON.stringify(this.rules));
          resolve();
        }
      });
    }

    async saveObservations() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [this.OBSERVATIONS_KEY]: this.observations }, () => resolve());
        } else {
          localStorage.setItem(this.OBSERVATIONS_KEY, JSON.stringify(this.observations));
          resolve();
        }
      });
    }

    getAllRules() {
      return this.rules;
    }

    getEligibleRules() {
      return this.rules.filter((r) => r.status === 'verified' || r.status === 'native');
    }

    // Stable identity key for a template — same {type, params} always produces the
    // same string regardless of key insertion order. Used both to dedupe repeat
    // rule matches and to find-or-create an observation.
    _signatureFor(template) {
      const keys = Object.keys(template).filter((k) => k !== 'type').sort();
      const parts = keys.map((k) => `${k}=${template[k]}`);
      return `${template.type}::${parts.join('|')}`;
    }

    findRuleBySignature(template) {
      const sig = this._signatureFor(template);
      return this.rules.find((r) => this._signatureFor(r.template) === sig) || null;
    }

    async addRule({ name, template, sampleText, source }) {
      const newRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: (name || '').trim() || 'Untitled Rule',
        kind: 'template',
        template,
        sampleText: sampleText || '',
        matchCount: 0,
        rejectedCount: 0,
        createdAt: new Date().toISOString(),
        lastVerifiedAt: null,
        status: 'candidate',
        source: source || 'user-authored'
      };
      this.rules.push(newRule);
      await this.save();
      return newRule;
    }

    async updateRule(id, patch) {
      const rule = this.rules.find((r) => r.id === id);
      if (!rule) return null;
      Object.assign(rule, patch);
      await this.save();
      return rule;
    }

    async setStatus(id, status) {
      const rule = this.rules.find((r) => r.id === id);
      if (!rule) return null;
      rule.status = status;
      if (status === 'verified' || status === 'native') {
        rule.lastVerifiedAt = new Date().toISOString();
      }
      await this.save();
      return rule;
    }

    async recordRuleUsage(id) {
      const rule = this.rules.find((r) => r.id === id);
      if (!rule) return;
      rule.matchCount = (rule.matchCount || 0) + 1;
      rule.lastVerifiedAt = new Date().toISOString();
      await this.save();
    }

    async recordRejection(id) {
      const rule = this.rules.find((r) => r.id === id);
      if (!rule) return;
      rule.rejectedCount = (rule.rejectedCount || 0) + 1;
      await this.save();
    }

    async deleteRule(id) {
      this.rules = this.rules.filter((r) => r.id !== id);
      await this.save();
    }

    // -- Observed templates: pre-rule bookkeeping, never surfaced in the Rules Manager UI --

    async recordObservation(template, sampleText) {
      const signature = this._signatureFor(template);
      let observation = this.observations.find((o) => o.signature === signature);
      const now = new Date().toISOString();

      if (observation) {
        observation.occurrences += 1;
        observation.lastSeen = now;
        observation.sampleText = sampleText || observation.sampleText;
      } else {
        observation = { signature, template, occurrences: 1, firstSeen: now, lastSeen: now, sampleText: sampleText || '' };
        this.observations.push(observation);
      }

      await this.saveObservations();
      return observation;
    }

    async promoteObservationToRule(observation, { name, source }) {
      const rule = await this.addRule({
        name,
        template: observation.template,
        sampleText: observation.sampleText,
        source
      });
      this.observations = this.observations.filter((o) => o.signature !== observation.signature);
      await this.saveObservations();
      return rule;
    }
  };
}
