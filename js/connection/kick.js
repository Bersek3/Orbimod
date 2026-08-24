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
    const channelString = `chatrooms.${chatroomId}.v2`;
    this.ws.send(JSON.stringify({
      event: 'pusher:subscribe',
      data: { auth: '', channel: channelString }
    }));
  }

  partChannel(channelName) {
    const cleanChan = channelName.toLowerCase().trim();
    const chatroomId = this.channels.get(cleanChan);
    if (chatroomId && this.ws && this.connected) {
      this.ws.send(JSON.stringify({
        event: 'pusher:unsubscribe',
        data: { channel: `chatrooms.${chatroomId}.v2` }
      }));
    }
    this.channels.delete(cleanChan);
  }

  async _fetchChatroomId(channelName) {
    // Attempt to lookup Kick chatroom ID or fallback to hash-based pseudo id
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

    // Fallback ID representation
    return 'cr_' + Math.abs(channelName.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
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

    if (eventName === 'App\\Events\\ChatMessageEvent') {
      const sender = data.sender || {};
      const badges = [];

      if (sender.identity && sender.identity.badges) {
        sender.identity.badges.forEach(b => {
          if (b.type) badges.push(b.type.toLowerCase());
        });
      }

      // Map channel name from pusher channel string
      let channelName = '';
      const chanMatch = msg.channel ? msg.channel.match(/chatrooms\.(.+)\.v2/) : null;
      if (chanMatch) {
        const cId = chanMatch[1];
        for (const [name, id] of this.channels.entries()) {
          if (String(id) === String(cId)) {
            channelName = name;
            break;
          }
        }
      }

      const msgObj = {
        id: data.id || ('kc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
        platform: 'kick',
        channel: channelName || 'kick',
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
    else if (eventName === 'App\\Events\\MessageDeletedEvent') {
      if (this.onModAction) {
        this.onModAction({
          type: 'DELETE',
          platform: 'kick',
          targetMsgId: data.message ? data.message.id : data.id
        });
      }
    }
    else if (eventName === 'App\\Events\\UserBannedEvent') {
      if (this.onModAction) {
        this.onModAction({
          type: 'BAN',
          platform: 'kick',
          targetUser: data.user ? data.user.username : 'desconocido'
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
