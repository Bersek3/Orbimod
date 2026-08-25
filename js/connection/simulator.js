/**
 * NEXUS MOD DECK — REALISTIC LIVE SIMULATOR ENGINE
 * Simulates active Twitch & Kick chat streams, bad words, spam spikes, and raids for testing.
 */

const SIMULATED_USERS = [
  { username: 'GamerPro_99', color: '#00F2FE', badges: ['subscriber', 'vip'], platform: 'twitch' },
  { username: 'Elena_Stream', color: '#FF7AC6', badges: ['subscriber'], platform: 'twitch' },
  { username: 'PixelMaster', color: '#FFB800', badges: ['vip'], platform: 'twitch' },
  { username: 'KickSniperX', color: '#53FC18', badges: ['og', 'subscriber'], platform: 'kick' },
  { username: 'NightWolf_9', color: '#BD93F9', badges: ['subscriber'], platform: 'kick' },
  { username: 'SantiGamer', color: '#00F090', badges: [], platform: 'twitch' },
  { username: 'SpamBot_404', color: '#FF5555', badges: [], platform: 'twitch' },
  { username: 'CryptoGuru_Official', color: '#FF5555', badges: [], platform: 'kick' },
  { username: 'Mod_Jessica', color: '#00AD03', badges: ['moderator'], platform: 'twitch' },
  { username: 'Mod_Carlos', color: '#53FC18', badges: ['moderator'], platform: 'kick' },
  { username: 'NovatoEnElChat', color: '#8BE9FD', badges: [], platform: 'twitch', isFirstMessage: true },
  { username: 'ViperKing', color: '#F1FA8C', badges: ['subscriber'], platform: 'kick' }
];

const NORMAL_MESSAGES = [
  '¡Qué buena jugada hermano! 🔥',
  'JAJAJAJA no puede ser 😂',
  'W stream como siempre',
  '¿A qué hora termina el directo hoy?',
  'PogChamp qué nivel',
  'GG WP a todos',
  '¡Saludos desde México! 🇲🇽',
  '¿Alguien para jugar luego en Discord?',
  'Clipen eso por favor jajaja',
  'F en el chat muchachos',
  'Ese tiro estuvo rotísimo 🎯',
  '¡Vamos que se remonta esto!',
  'Qué buena música de fondo',
  'Hermano acabas de romper el juego 💀',
  'Sub número 5 meses seguidos aquí, gracias por el contenido'
];

const SPAM_MESSAGES = [
  'FREE NITRO DISCORD CLICKEEN AQUI -> discord.gg/free-nitro-scam123',
  'CHEAP FOLLOWERS AND VIEWERS AT HTTP://VIEWBOT-PRO.XYZ BUY NOW!',
  'AAAAAAAAAAA NO PUEDE SEEEEEEER AAAAAAAAAAAAA !!!!!!!',
  'GANEN $500 DÓLARES GRATIS EN T.ME/CRYPTO_HACK_2026',
  'COMPREN SEGUIDORES BARATOS EN WWW.INSTA-FOLLOWERS-BOT.COM',
  'SUB x SUB EN MI CANAL ENTREN TODOS YA MISMO'
];

export class LiveSimulator {
  constructor(onMessage, onEvent) {
    this.onMessage = onMessage;
    this.onEvent = onEvent;
    this.active = false;
    this.intervalId = null;
    this.raidIntervalId = null;
    this.channels = [];
  }

  setChannels(channels) {
    this.channels = channels;
  }

  start() {
    this.active = true;
    this._scheduleNextMessage();
    this._scheduleRandomEvents();
  }

  stop() {
    this.active = false;
    clearTimeout(this.intervalId);
    clearInterval(this.raidIntervalId);
  }

  _scheduleNextMessage() {
    if (!this.active) return;

    // Random delay between 700ms and 2400ms
    const delay = Math.floor(Math.random() * 1700) + 700;
    this.intervalId = setTimeout(() => {
      this._generateMessage();
      this._scheduleNextMessage();
    }, delay);
  }

  _generateMessage() {
    if (!this.channels || this.channels.length === 0) return;

    // Pick random channel
    const channel = this.channels[Math.floor(Math.random() * this.channels.length)];
    const isSpam = Math.random() < 0.15; // 15% chance of flagged message/spam for automod testing

    let user;
    let text;

    if (isSpam) {
      user = Math.random() > 0.5 ? SIMULATED_USERS[6] : SIMULATED_USERS[7];
      text = SPAM_MESSAGES[Math.floor(Math.random() * SPAM_MESSAGES.length)];
    } else {
      user = SIMULATED_USERS[Math.floor(Math.random() * SIMULATED_USERS.length)];
      text = NORMAL_MESSAGES[Math.floor(Math.random() * NORMAL_MESSAGES.length)];
    }

    const msgObj = {
      id: 'sim-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      platform: channel.platform || user.platform,
      channel: channel.name.toLowerCase(),
      username: user.username,
      displayName: user.username,
      color: user.color,
      badges: [...user.badges],
      text: text,
      timestamp: new Date().toISOString(),
      isMod: user.badges.includes('moderator'),
      isSub: user.badges.includes('subscriber'),
      isVip: user.badges.includes('vip'),
      isFirstMessage: !!user.isFirstMessage
    };

    if (this.onMessage) {
      this.onMessage(msgObj);
    }
  }

  _scheduleRandomEvents() {
    this.raidIntervalId = setInterval(() => {
      if (!this.active || !this.channels || this.channels.length === 0) return;

      const eventType = Math.random() > 0.4 ? 'SUB' : 'RAID';
      const channel = this.channels[Math.floor(Math.random() * this.channels.length)];

      if (eventType === 'RAID') {
        const raiders = ['TheGrefg', 'ElMariana', 'Roier', 'Spreen', 'Rivers_gg', 'IlloJuan'];
        const raider = raiders[Math.floor(Math.random() * raiders.length)];
        const count = Math.floor(Math.random() * 4500) + 400;

        if (this.onEvent) {
          this.onEvent({
            type: 'RAID',
            channel: channel.name,
            platform: channel.platform,
            raider: raider,
            viewers: count,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        const subUsers = ['GamerFan_01', 'Alejandro_V', 'Camila_Tw', 'Nacho_Gamer'];
        const subUser = subUsers[Math.floor(Math.random() * subUsers.length)];
        const tier = Math.random() > 0.7 ? 'Tier 2 (6 Meses)' : 'Tier 1 Prime (Nuevo)';

        if (this.onEvent) {
          this.onEvent({
            type: 'SUB',
            channel: channel.name,
            platform: channel.platform,
            user: subUser,
            tier: tier,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, 45000); // every 45s a simulated sub/raid event
  }

  // Trigger manual test event from UI
  triggerManualSpam(channelName) {
    const user = SIMULATED_USERS[6];
    const text = SPAM_MESSAGES[Math.floor(Math.random() * SPAM_MESSAGES.length)];
    const msgObj = {
      id: 'sim-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      platform: 'twitch',
      channel: channelName.toLowerCase(),
      username: user.username,
      displayName: user.username,
      color: user.color,
      badges: [],
      text: text,
      timestamp: new Date().toISOString(),
      isMod: false,
      isSub: false,
      isVip: false,
      isFirstMessage: false
    };
    if (this.onMessage) this.onMessage(msgObj);
  }

  triggerManualRaid(channelName) {
    if (this.onEvent) {
      this.onEvent({
        type: 'RAID',
        channel: channelName,
        platform: 'twitch',
        raider: 'IbaiLlanos',
        viewers: 12540,
        timestamp: new Date().toISOString()
      });
    }
  }
}
