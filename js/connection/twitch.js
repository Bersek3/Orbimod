/**
 * NEXUS MOD DECK — TWITCH IRC WEBSOCKET CLIENT
 * Connects directly to Twitch IRC for real-time messages & mod events.
 */

export class TwitchClient {
  constructor(onMessage, onModAction, onStatusChange) {
    this.ws = null;
    this.channels = new Set();
    this.onMessage = onMessage;
    this.onModAction = onModAction;
    this.onStatusChange = onStatusChange;
    this.connected = false;
    this.token = null;
    this.username = null;
    this.reconnectTimer = null;
  }

  connect(token = null, username = null) {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    this.token = token;
    this.username = username || `justinfan${Math.floor(10000 + Math.random() * 89999)}`;
    const wsUrl = 'wss://irc-ws.chat.twitch.tv:443';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        if (this.onStatusChange) this.onStatusChange(true);

        // Request Twitch tags & commands capabilities
        this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership\r\n');
        if (this.token) {
          const pass = this.token.startsWith('oauth:') ? this.token : `oauth:${this.token}`;
          this.ws.send(`PASS ${pass}\r\n`);
          this.ws.send(`NICK ${this.username.toLowerCase()}\r\n`);
        } else {
          this.ws.send(`NICK ${this.username}\r\n`);
        }

        // Re-join active channels
        this.channels.forEach(ch => {
          this._sendJoin(ch);
        });
      };

      this.ws.onmessage = (event) => {
        this._parseIrc(event.data);
      };

      this.ws.onclose = () => {
        this.connected = false;
        if (this.onStatusChange) this.onStatusChange(false);
        this._scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('Twitch WS error:', err);
      };
    } catch (e) {
      console.error('Failed to create Twitch WS:', e);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.channels.size > 0) {
        this.connect(this.token, this.username);
      }
    }, 5000);
  }

  _sendJoin(channel) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const cleanChan = channel.toLowerCase().replace('#', '');
      try {
        this.ws.send(`JOIN #${cleanChan}\r\n`);
      } catch (e) {
        console.warn('[Twitch join error]', e);
      }
    }
  }

  joinChannel(channel) {
    const cleanChan = channel.toLowerCase().replace('#', '');
    this.channels.add(cleanChan);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._sendJoin(cleanChan);
    }
  }

  partChannel(channel) {
    const cleanChan = channel.toLowerCase().replace('#', '');
    this.channels.delete(cleanChan);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(`PART #${cleanChan}\r\n`);
      } catch (e) {}
    }
  }

  sendMessage(channel, text) {
    // Read-only mode: No outbound PRIVMSG sent to streamers' chats
    console.log('[Twitch] Moderación en modo lectura: envío de mensajes a chat deshabilitado.');
  }

  sendModCommand(channel, command) {
    // Helix REST API is used for real mod actions (timeouts/bans)
    console.log('[Twitch] Mod command via IRC ignored; Helix API is used instead.');
  }

  _parseIrc(raw) {
    const lines = raw.split('\r\n');
    lines.forEach(line => {
      if (!line) return;

      // Handle PING / PONG heartbeat
      if (line.startsWith('PING')) {
        this.ws.send('PONG :tmi.twitch.tv\r\n');
        return;
      }

      // Parse IRC tags
      let tags = {};
      let rest = line;

      if (line.startsWith('@')) {
        const spaceIndex = line.indexOf(' ');
        const rawTags = line.substring(1, spaceIndex).split(';');
        rawTags.forEach(t => {
          const [k, v] = t.split('=');
          tags[k] = v;
        });
        rest = line.substring(spaceIndex + 1);
      }

      // PRIVMSG (Regular chat message)
      if (rest.includes('PRIVMSG')) {
        const match = rest.match(/:([^!]+)![^ ]+ PRIVMSG #([^ ]+) :(.*)/);
        if (match) {
          const [, username, channel, messageText] = match;
          const badges = [];
          if (tags.badges) {
            tags.badges.split(',').forEach(b => {
              const bName = b.split('/')[0];
              if (bName) badges.push(bName);
            });
          }

          const msgObj = {
            id: tags.id || ('tw-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
            platform: 'twitch',
            channel: channel.toLowerCase(),
            username: username,
            displayName: tags['display-name'] || username,
            color: tags.color || '#9146ff',
            badges: badges,
            text: messageText,
            timestamp: tags['tmi-sent-ts'] ? new Date(parseInt(tags['tmi-sent-ts'])).toISOString() : new Date().toISOString(),
            isMod: tags.mod === '1' || badges.includes('moderator') || badges.includes('broadcaster'),
            isSub: tags.subscriber === '1' || badges.includes('subscriber'),
            isVip: badges.includes('vip'),
            isFirstMessage: tags['first-msg'] === '1'
          };

          if (this.onMessage) this.onMessage(msgObj);
        }
      }
      // CLEARCHAT (Timeout or Ban event or Chat Cleared)
      else if (rest.includes('CLEARCHAT')) {
        const chanMatch = rest.match(/#([^ ]+)(?: :(.+))?/);
        if (chanMatch) {
          const channel = chanMatch[1];
          const targetUser = chanMatch[2] || null;
          const duration = tags['ban-duration'] ? parseInt(tags['ban-duration']) : null;
          const isTimeout = Boolean(duration);

          if (this.onModAction) {
            if (targetUser) {
              this.onModAction({
                type: isTimeout ? 'TIMEOUT' : 'BAN',
                platform: 'twitch',
                channel: channel.toLowerCase(),
                targetUser: targetUser,
                mod: 'Moderador Twitch',
                duration: duration,
                details: isTimeout 
                  ? `Silenciado por ${duration >= 60 ? Math.round(duration / 60) + ' min (' + duration + 's)' : duration + 's'}` 
                  : `Veto permanente del canal`
              });
            } else {
              this.onModAction({
                type: 'MODE_CHANGE',
                platform: 'twitch',
                channel: channel.toLowerCase(),
                mod: 'Moderador Twitch',
                details: 'El chat fue vaciado por un moderador (/clear)'
              });
            }
          }
        }
      }
      // CLEARMSG (Single message deleted)
      else if (rest.includes('CLEARMSG')) {
        const targetMsgId = tags['target-msg-id'];
        const targetLogin = tags['login'] || null;
        const chanMatch = rest.match(/#([^ ]+)(?: :(.*))?/);
        const channel = chanMatch ? chanMatch[1] : '';
        const msgText = chanMatch ? chanMatch[2] : '';

        if (this.onModAction) {
          this.onModAction({
            type: 'DELETE',
            platform: 'twitch',
            channel: channel.toLowerCase(),
            targetMsgId: targetMsgId,
            targetUser: targetLogin,
            mod: 'Moderador Twitch',
            details: msgText ? `Mensaje eliminado: "${msgText.slice(0, 60)}"` : 'Mensaje eliminado del chat'
          });
        }
      }
      // ROOMSTATE (Chat settings updated)
      else if (rest.includes('ROOMSTATE')) {
        const chanMatch = rest.match(/#([^ ]+)/);
        const channel = chanMatch ? chanMatch[1] : '';
        const modes = [];
        if (tags['slow'] && tags['slow'] !== '0') modes.push(`Modo Lento (${tags['slow']}s)`);
        if (tags['subs-only'] === '1') modes.push('Solo Suscriptores');
        if (tags['followers-only'] && tags['followers-only'] !== '-1') modes.push(`Solo Seguidores (${tags['followers-only']}m)`);
        if (tags['emote-only'] === '1') modes.push('Solo Emotes');

        if (modes.length > 0 && this.onModAction) {
          this.onModAction({
            type: 'MODE_CHANGE',
            platform: 'twitch',
            channel: channel.toLowerCase(),
            mod: 'Moderador Twitch',
            details: `Ajustes del chat: ${modes.join(', ')}`
          });
        }
      }
    });
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
