/**
 * NEXUS MOD DECK — AUTOMOD & FILTER ENGINE
 * Regex patterns, link detection, spam heuristics, caps limiter, flagged queue
 */

import { storageService } from './storageService.js';
import { soundService } from './soundService.js';

class AutoModService {
  constructor() {
    this.config = storageService.getAutoModConfig();
    this.flaggedQueue = [];
    this.listeners = [];
  }

  onQueueChange(cb) {
    this.listeners.push(cb);
  }

  _notifyListeners() {
    this.listeners.forEach(cb => cb(this.flaggedQueue));
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    storageService.saveAutoModConfig(this.config);
  }

  /**
   * Evaluates a message against all AutoMod rules.
   * Returns: { passed: boolean, reason: string|null, confidence: number, ruleType: string|null }
   */
  evaluate(message, author, channelName, platform) {
    if (!this.config.enabled) {
      return { passed: true };
    }

    const text = message.trim();
    if (!text) return { passed: true };

    // 1. Check Link Protection
    if (this.config.blockLinks) {
      const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(?:com|org|net|io|gg|tv|me|xyz|ru|to|app|cc)(?:\/[^\s]*)?)/gi;
      const urls = text.match(urlRegex);

      if (urls && urls.length > 0) {
        // Check whitelist
        const isWhitelisted = urls.every(url => {
          const lower = url.toLowerCase();
          return this.config.linkWhitelist.some(domain => lower.includes(domain.toLowerCase()));
        });

        if (!isWhitelisted) {
          return {
            passed: false,
            reason: `Enlace no autorizado detectado: "${urls[0]}"`,
            confidence: 0.95,
            ruleType: 'LINK_BLOCK'
          };
        }
      }
    }

    // 2. Check Blacklist Words / Regex
    for (const term of this.config.blacklistWords) {
      if (!term || !term.trim()) continue;
      const cleanTerm = term.trim();

      // Check if term is regex formatted /term/i
      if (cleanTerm.startsWith('/') && cleanTerm.lastIndexOf('/') > 0) {
        try {
          const lastSlash = cleanTerm.lastIndexOf('/');
          const pattern = cleanTerm.substring(1, lastSlash);
          const flags = cleanTerm.substring(lastSlash + 1) || 'i';
          const reg = new RegExp(pattern, flags);
          if (reg.test(text)) {
            return {
              passed: false,
              reason: `Coincidencia con regla Regex: "${cleanTerm}"`,
              confidence: 0.99,
              ruleType: 'BLACKLIST_REGEX'
            };
          }
        } catch (e) {}
      } else {
        // Literal word or wildcard
        const lowerText = text.toLowerCase();
        const lowerTerm = cleanTerm.toLowerCase();

        if (lowerTerm.startsWith('*') && lowerTerm.endsWith('*')) {
          const core = lowerTerm.slice(1, -1);
          if (lowerText.includes(core)) {
            return {
              passed: false,
              reason: `Palabra prohibida (comodín): "*${core}*"`,
              confidence: 0.9,
              ruleType: 'BLACKLIST_WORD'
            };
          }
        } else if (lowerText.includes(lowerTerm)) {
          return {
            passed: false,
            reason: `Palabra prohibida en lista negra: "${cleanTerm}"`,
            confidence: 0.95,
            ruleType: 'BLACKLIST_WORD'
          };
        }
      }
    }

    // 3. Check Excessive CAPS
    if (text.length >= this.config.minCapsLength) {
      let uppercaseCount = 0;
      let letterCount = 0;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(char)) {
          letterCount++;
          if (char === char.toUpperCase()) {
            uppercaseCount++;
          }
        }
      }

      if (letterCount >= this.config.minCapsLength) {
        const capsRatio = (uppercaseCount / letterCount) * 100;
        if (capsRatio >= this.config.capsThreshold) {
          return {
            passed: false,
            reason: `Exceso de mayúsculas (${Math.round(capsRatio)}% > ${this.config.capsThreshold}%)`,
            confidence: 0.85,
            ruleType: 'EXCESSIVE_CAPS'
          };
        }
      }
    }

    // 4. Check Repetitive Character Spam (e.g. aaaaaaa, ???????)
    const repeatRegex = /(.)\1{6,}/gi;
    if (repeatRegex.test(text)) {
      return {
        passed: false,
        reason: `Spam de caracteres repetidos consecutivos`,
        confidence: 0.88,
        ruleType: 'CHAR_FLOOD'
      };
    }

    return { passed: true };
  }

  /**
   * Adds an item to the AutoMod review queue and triggers audio alert
   */
  queueForReview(messageObj, reason, ruleType) {
    const queueItem = {
      id: 'flag-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      messageId: messageObj.id,
      text: messageObj.text,
      username: messageObj.username,
      displayName: messageObj.displayName || messageObj.username,
      color: messageObj.color,
      badges: messageObj.badges || [],
      channel: messageObj.channel,
      platform: messageObj.platform,
      reason: reason,
      ruleType: ruleType,
      timestamp: new Date().toISOString(),
      status: 'pending' // 'pending', 'approved', 'rejected', 'sanctioned'
    };

    this.flaggedQueue.unshift(queueItem);
    soundService.playFlagAlert();
    this._notifyListeners();
    return queueItem;
  }

  getQueue() {
    return this.flaggedQueue;
  }

  getPendingCount() {
    return this.flaggedQueue.filter(i => i.status === 'pending').length;
  }

  resolveItem(itemId, resolution) {
    const item = this.flaggedQueue.find(i => i.id === itemId);
    if (item) {
      item.status = resolution; // 'approved' | 'rejected' | 'sanctioned'
      this._notifyListeners();
    }
  }

  clearResolved() {
    this.flaggedQueue = this.flaggedQueue.filter(i => i.status === 'pending');
    this._notifyListeners();
  }
}

export const automodService = new AutoModService();
