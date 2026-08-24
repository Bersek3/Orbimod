/**
 * NEXUS MOD DECK — DEFAULT MACROS & CANNED MESSAGES
 */

export const DEFAULT_MACROS = [
  {
    id: 'macro-rules',
    name: '📜 Reglas',
    text: '🛡️ [MOD]: Por favor mantengan el respeto en el chat. Cero insultos, spam o links no autorizados. ¡Disfruten el stream!',
    hotkey: 'Ctrl+1'
  },
  {
    id: 'macro-discord',
    name: '👾 Discord',
    text: '🚀 ¡Únete a nuestra comunidad en Discord para noticias, sorteos y eventos! Enlace: https://discord.gg/streamer',
    hotkey: 'Ctrl+2'
  },
  {
    id: 'macro-warning',
    name: '⚠️ Advertencia',
    text: '⚠️ [AVISO MOD]: Por favor moderen el vocabulario y eviten el spam de mayúsculas para no recibir timeout.',
    hotkey: 'Ctrl+3'
  },
  {
    id: 'macro-sub',
    name: '⭐ Suscríbete',
    text: '💎 ¡Apoya el canal suscribiéndote con Prime gratis o tier 1 para desbloquear emotes exclusivos y chat sin modo lento!',
    hotkey: 'Ctrl+4'
  },
  {
    id: 'macro-clip',
    name: '🎬 Clip',
    text: '🔥 ¡Momento épico! No olviden clipear y compartirlo en el canal de clips del Discord.',
    hotkey: 'Ctrl+5'
  }
];

export const DEFAULT_CHANNELS = [
  {
    id: 'ch-ibai',
    name: 'ibai',
    platform: 'twitch',
    avatar: 'https://static-cdn.jtvnw.net/jtv_user_pictures/57422030-77c3-4529-a0db-af62b9f369aa-profile_image-70x70.png',
    viewers: 42890,
    isLive: true,
    videoEnabled: true,
    slowMode: 0,
    subOnly: false,
    followOnly: false,
    emoteOnly: false
  },
  {
    id: 'ch-westcol',
    name: 'westcol',
    platform: 'kick',
    avatar: 'https://files.kick.com/images/user/296711/profile_image/conversion/3f76da74-0fbe-497a-a53c-1456bf8f47ba-full.webp',
    viewers: 31450,
    isLive: true,
    videoEnabled: true,
    slowMode: 0,
    subOnly: false,
    followOnly: false,
    emoteOnly: false
  },
  {
    id: 'ch-auronplay',
    name: 'auronplay',
    platform: 'twitch',
    avatar: 'https://static-cdn.jtvnw.net/jtv_user_pictures/c7512760-444a-47ca-826c-ea8aeaa039f9-profile_image-70x70.png',
    viewers: 28310,
    isLive: true,
    videoEnabled: false,
    slowMode: 3,
    subOnly: false,
    followOnly: true,
    emoteOnly: false
  },
  {
    id: 'ch-xqc',
    name: 'xqc',
    platform: 'kick',
    avatar: 'https://files.kick.com/images/user/14549/profile_image/conversion/0b2848c4-c2c6-47b2-bd7d-78809e25d259-full.webp',
    viewers: 55120,
    isLive: true,
    videoEnabled: false,
    slowMode: 0,
    subOnly: false,
    followOnly: false,
    emoteOnly: false
  }
];
