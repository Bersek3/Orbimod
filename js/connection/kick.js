/**
 * NEXUS MOD DECK — KICK PUSHER WEBSOCKET CLIENT
 * Connects to Kick's Pusher cluster for real-time chat & moderation events.
 */

export class KickClient {
  constructor(onMessage, onModAction, onStatusChange) {
    this.ws = null;
    this.channels = new Map(); // channelName -> chatroomId
    this.onMessage = onMessage;
    this.onModAction = onModAction;
    this.onStatusChange = onStatusChange;
    this.connected = false;
    this.reconnectTimer = null;
    this.pingInterval = null;
  }

  connect() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    const pusherUrl = 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false';

    try {
      this.ws = new WebSocket(pusherUrl);

      this.ws.onopen = () => {
        this.connected = true;
        if (this.onStatusChange) this.onStatusChange(true);
        this._startHeartbeat();

        // Resubscribe to existing channels
        this.channels.forEach((chatroomId, channelName) => {
          this._subscribeChannel(channelName, chatroomId);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this._handleEvent(payload);
        } catch (e) {}
      };

      this.ws.onclose = () => {
        this.connected = false;
        clearInterval(this.pingInterval);
        if (this.onStatusChange) this.onStatusChange(false);
        this._scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('Kick Pusher WS error:', err);
      };
    } catch (e) {
      console.error('Failed to create Kick WS:', e);
      this._scheduleReconnect();
    }
  }

  _startHeartbeat() {
    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.connected) {
        this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, 25000);
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.channels.size > 0) {
        this.connect();
      }
    }, 5000);
  }

  async joinChannel(channelName, knownChatroomId = null) {
    const cleanChan = channelName.toLowerCase().trim();

    let chatroomId = knownChatroomId;
    if (!chatroomId) {
      chatroomId = await this._fetchChatroomId(cleanChan);
    }

    this.channels.set(cleanChan, chatroomId);

    if (this.connected && chatroomId) {
      this._subscribeChannel(cleanChan, chatroomId);
    }
  }

  _subscribeChannel(channelName, chatroomId) {
    if (!this.ws || !this.connected) return;
    const toSubscribe = new Set();
    if (chatroomId) {
      toSubscribe.add(`chatrooms.${chatroomId}.v2`);
      toSubscribe.add(`channel.${chatroomId}`);
    }
    toSubscribe.add(`chatrooms.${channelName}.v2`);
    toSubscribe.add(`channel.${channelName}`);

    toSubscribe.forEach(chStr => {
      try {
        this.ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { auth: '', channel: chStr }
        }));
      } catch (e) {}
    });
  }

  partChannel(channelName) {
    const cleanChan = channelName.toLowerCase().trim();
    const chatroomId = this.channels.get(cleanChan);
    if (this.ws && this.connected) {
      const toUnsub = [`chatrooms.${chatroomId || cleanChan}.v2`, `channel.${chatroomId || cleanChan}`, `chatrooms.${cleanChan}.v2`];
      toUnsub.forEach(chStr => {
        try {
          this.ws.send(JSON.stringify({
            event: 'pusher:unsubscribe',
            data: { channel: chStr }
          }));
        } catch (e) {}
      });
    }
    this.channels.delete(cleanChan);
  }

  async _fetchChatroomId(channelName) {
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${channelName}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.chatroom && data.chatroom.id) {
          return data.chatroom.id;
        }
      }
    } catch (e) {}

    try {
      const res = await fetch(`https://kick.com/api/v1/channels/${channelName}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.chatroom && data.chatroom.id) {
          return data.chatroom.id;
        }
      }
    } catch (e) {}

    return channelName;
  }

  _handleEvent(msg) {
    const eventName = msg.event;
    if (!msg.data) return;

    let data = {};
    try {
      data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
    } catch (e) {
      return;
    }

    // Map channel name from pusher channel string or channel registry
    let channelName = '';
    if (msg.channel) {
      const chanMatch = msg.channel.match(/(?:chatrooms?|channels?)\.([^\.]+)/i);
      const cId = chanMatch ? chanMatch[1] : msg.channel;
      for (const [name, id] of this.channels.entries()) {
        if (String(id) === String(cId) || String(id) === String(msg.channel) || String(name) === String(cId)) {
          channelName = name;
          break;
        }
      }
    }
    if (!channelName && data.channel && data.channel.slug) {
      channelName = data.channel.slug;
    }
    if (!channelName && this.channels.size === 1) {
      channelName = Array.from(this.channels.keys())[0];
    }
    if (!channelName) {
      channelName = 'kick';
    }

    if (eventName === 'App\\Events\\ChatMessageEvent' || eventName === 'ChatMessageEvent') {
      const sender = data.sender || {};
      const badges = [];

      if (sender.identity && sender.identity.badges) {
        sender.identity.badges.forEach(b => {
          if (b.type) badges.push(b.type.toLowerCase());
        });
      }

      const msgObj = {
        id: data.id || ('kc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
        platform: 'kick',
        channel: channelName,
        username: sender.username || 'UsuarioKick',
        displayName: sender.username || 'UsuarioKick',
        color: (sender.identity && sender.identity.color) || '#53fc18',
        badges: badges,
        text: data.content || '',
        timestamp: data.created_at || new Date().toISOString(),
        isMod: badges.includes('moderator') || badges.includes('broadcaster'),
        isSub: badges.includes('subscriber'),
        isVip: badges.includes('vip'),
        isFirstMessage: false
      };

      if (this.onMessage) this.onMessage(msgObj);
    }
    else if (eventName === 'App\\Events\\MessageDeletedEvent' || eventName === 'MessageDeletedEvent' || eventName?.includes('Deleted')) {
      const mod = data.deleted_by || data.moderator || data.mod || {};
      const msgObj = data.message || {};
      const targetUser = msgObj.sender?.username || msgObj.username || data.user?.username || null;
      const modUsername = mod.username || mod.name || (mod.slug ? mod.slug : 'Moderador Kick');
      const content = msgObj.content || data.content || '';

      if (this.onModAction) {
        this.onModAction({
          type: 'DELETE',
          platform: 'kick',
          channel: channelName,
          targetMsgId: msgObj.id || data.id,
          targetUser: targetUser,
          mod: modUsername,
          details: content ? `Mensaje eliminado: "${content.slice(0, 60)}"` : 'Mensaje eliminado del chat'
        });
      }
    }
    else if (eventName === 'App\\Events\\UserBannedEvent' || eventName === 'UserBannedEvent' || eventName?.includes('Banned')) {
      const user = data.user || data.banned_user || {};
      const mod = data.banned_by || data.moderator || data.mod || {};
      const targetUsername = user.username || user.name || data.username || 'desconocido';
      const modUsername = mod.username || mod.name || (mod.slug ? mod.slug : 'Moderador Kick');
      
      const isPermanent = data.permanent !== undefined ? Boolean(data.permanent) : (data.duration === 0 || !data.duration);
      const duration = data.duration ? parseInt(data.duration) : (data.duration_seconds || null);
      const reason = data.reason || (isPermanent ? 'Veto permanente del canal' : `Silenciado por ${duration}s`);

      if (this.onModAction) {
        this.onModAction({
          type: isPermanent ? 'BAN' : 'TIMEOUT',
          platform: 'kick',
          channel: channelName,
          targetUser: targetUsername,
          mod: modUsername,
          duration: duration,
          permanent: isPermanent,
          reason: reason,
          details: isPermanent 
            ? `Veto permanente ejecutado por @${modUsername}${data.reason ? ' • Motivo: "' + data.reason + '"' : ''}` 
            : `Silenciado por ${duration >= 60 ? Math.round(duration / 60) + ' min (' + duration + 's)' : duration + 's'} por @${modUsername}${data.reason ? ' • Motivo: "' + data.reason + '"' : ''}`
        });
      }
    }
    else if (eventName === 'App\\Events\\ChatroomUpdatedEvent' || eventName === 'ChatroomUpdatedEvent') {
      const mod = data.updated_by || data.moderator || {};
      const modUsername = mod.username || 'Moderador Kick';
      const modes = [];
      if (data.slow_mode) modes.push(`Modo Lento (${data.slow_mode_duration || 5}s)`);
      if (data.subscribers_only) modes.push('Solo Suscriptores');
      if (data.followers_only) modes.push('Solo Seguidores');
      if (data.emotes_only) modes.push('Solo Emotes');

      if (this.onModAction) {
        this.onModAction({
          type: 'MODE_CHANGE',
          platform: 'kick',
          channel: channelName,
          mod: modUsername,
          details: modes.length > 0 ? `Modos actualizados: ${modes.join(', ')}` : 'Ajustes del chatroom actualizados'
        });
      }
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
