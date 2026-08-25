/**
 * NEXUS MOD DECK — SIMULATOR ENGINE (DISABLED FOR PURE LIVE STREAM MONITORING)
 * All simulated fake messages are completely disabled to ensure only 100% real stream chat is shown.
 */

export class LiveSimulator {
  constructor(onMessage, onEvent) {
    this.onMessage = null;
    this.onEvent = null;
    this.active = false;
    this.channels = [];
  }

  setChannels(channels) {
    this.channels = channels || [];
  }

  start() {
    this.active = false;
  }

  stop() {
    this.active = false;
  }

  triggerManualSpam() {}
  triggerManualRaid() {}
}
