// features/ai/gemini-client.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

// Runs in the background service worker (self, not window) — the only place in
// this extension that calls fetch() against the Gemini API. Loaded via
// background.js's importScripts(), after gemini-prompts.js.
self.FiboGeminiClient = class FiboGeminiClient {
  constructor() {
    this.MODEL = 'gemini-3.6-flash';           // bump here when Google rotates the endpoint tag
    this.FALLBACK_MODEL = 'gemini-3.5-flash-lite';
    this.API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async extractFiles(rawText, context, apiKey) {
    const prompt = self.FiboGeminiPrompts.buildExtractionPrompt(rawText, context);
    const data = await this._generate(prompt, this._extractionSchema(), apiKey);
    if (!data || !Array.isArray(data.files)) {
      throw new Error('Gemini returned unparsable JSON despite responseSchema enforcement.');
    }
    return data.files;
  }

  async induceTemplate(sampleText, apiKey) {
    const prompt = self.FiboGeminiPrompts.buildInductionPrompt(sampleText);
    const data = await this._generate(prompt, this._inductionSchema(), apiKey);
    if (!data || typeof data.templateType !== 'string') {
      throw new Error('Gemini returned unparsable JSON despite responseSchema enforcement.');
    }
    return {
      templateType: data.templateType,
      suggestedName: data.suggestedName || '',
      params: this._paramsFor(data)
    };
  }

  // Keeps only the parameter field(s) relevant to the chosen template type, so
  // downstream signature/dedup logic (learned-rules-store.js) never has to deal
  // with irrelevant empty-string fields the schema allows but this template
  // doesn't use.
  _paramsFor(data) {
    switch (data.templateType) {
      case 'line-prefix': return { marker: data.marker || '' };
      case 'fenced-with-attr': return { attrKey: data.attrKey || '' };
      case 'numbered-list': return { itemPattern: data.itemPattern || '' };
      case 'xml-wrapper': return { tagName: data.tagName || '', pathAttr: data.pathAttr || '' };
      default: return {};
    }
  }

  async _generate(promptText, responseSchema, apiKey, modelOverride) {
    if (!apiKey) throw new Error('Gemini API key is not configured.');
    const model = modelOverride || this.MODEL;
    const url = `${this.API_BASE}/models/${model}:generateContent`;

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema }
        })
      });
    } catch (err) {
      throw new Error(`Network error contacting Gemini: ${err.message || err}`);
    }

    // One automatic retry against the lighter fallback model on quota exhaustion,
    // then give up with an explicit, actionable message — free-tier keys hit
    // RPM/TPM limits routinely enough that a generic HTTP-error string isn't useful.
    if (response.status === 429) {
      if (!modelOverride && model !== this.FALLBACK_MODEL) {
        return this._generate(promptText, responseSchema, apiKey, this.FALLBACK_MODEL);
      }
      throw new Error('Gemini API quota exceeded (429). Please wait a moment or check your API key limits.');
    }

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = (errBody && errBody.error && errBody.error.message) || '';
      } catch (_) { /* error body wasn't JSON */ }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Gemini rejected the API key.');
      }
      throw new Error(`Gemini API error (${response.status})${detail ? `: ${detail}` : ''}`);
    }

    const body = await response.json();

    if (body.promptFeedback && body.promptFeedback.blockReason) {
      throw new Error(`Gemini blocked the request: ${body.promptFeedback.blockReason}`);
    }

    const candidate = body.candidates && body.candidates[0];
    if (!candidate || !candidate.content || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
      throw new Error('Gemini returned no usable candidate (possibly blocked or an empty response).');
    }

    const text = candidate.content.parts.map((p) => p.text || '').join('');
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error('Gemini returned unparsable JSON despite responseSchema enforcement.');
    }
  }

  _extractionSchema() {
    return {
      type: 'OBJECT',
      properties: {
        files: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              path: { type: 'STRING' },
              content: { type: 'STRING' },
              changeType: { type: 'STRING', enum: ['new', 'updated', 'deleted'] },
              reasoning: { type: 'STRING' }
            },
            required: ['path', 'content']
          }
        }
      },
      required: ['files']
    };
  }

  _inductionSchema() {
    return {
      type: 'OBJECT',
      properties: {
        templateType: { type: 'STRING', enum: ['line-prefix', 'fenced-with-attr', 'numbered-list', 'xml-wrapper', 'unmatched'] },
        marker: { type: 'STRING' },
        attrKey: { type: 'STRING' },
        itemPattern: { type: 'STRING' },
        tagName: { type: 'STRING' },
        pathAttr: { type: 'STRING' },
        suggestedName: { type: 'STRING' }
      },
      required: ['templateType']
    };
  }
};
