export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.connections = new Map();
    this.isHost = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    
    // Add heartbeat checking
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = setInterval(() => this.checkHeartbeat(), 5000);
  }

  async hostGame() {
    return new Promise((resolve, reject) => {
      try {
        if (this.peer) {
          this.peer.destroy();
        }

        // Create new peer with more robust config
        this.peer = new Peer(undefined, {
          debug: 2,
          host: 'localhost',
          port: 9000,
          path: '/myapp',
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' }
            ]
          },
          retry_options: {
            retries: 3,
            minTimeout: 1000,
            maxTimeout: 5000
          }
        });

        // Better error handling for peer creation
        this.peer.on('open', (id) => {
          console.log('Hosting game with ID:', id);
          this.isHost = true;
          this.game.connectionStatus.textContent = `Hosting game. Your ID: ${id}`;
          this.setupPeerEventHandlers();
          this.lastHeartbeat = Date.now();
          resolve(id);
        });

        // Handle initial connection error
        this.peer.on('error', (error) => {
          console.error('Peer error:', error);
          if (error.type === 'network' || error.type === 'server-error') {
            this.game.connectionStatus.textContent = 'Network error. Please check your connection.';
          } else if (error.type === 'browser-incompatible') {
            this.game.connectionStatus.textContent = 'Browser not supported. Please use Chrome or Firefox.';
          } else {
            this.game.connectionStatus.textContent = `Connection error: ${error.type}`;
          }
          reject(error);
        });

      } catch (error) {
        console.error('Failed to create peer:', error);
        this.game.connectionStatus.textContent = 'Failed to initialize networking. Please try again.';
        reject(error);
      }
    });
  }

  async joinGame(hostId) {
    return new Promise((resolve, reject) => {
      try {
        if (!hostId) {
          throw new Error('Host ID is required');
        }

        this.peer = new Peer(undefined, {
          debug: 2,
          host: 'localhost',
          port: 9000,
          path: '/myapp',
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' }
            ]
          },
          retry_options: {
            retries: 3,
            minTimeout: 1000,
            maxTimeout: 5000
          }
        });

        this.peer.on('open', () => {
          console.log('Peer opened, attempting to connect to host:', hostId);
          const conn = this.peer.connect(hostId, {
            reliable: true,
            serialization: 'json'
          });
          
          conn.on('open', () => {
            console.log('Connected to host successfully');
            this.handleNewConnection(conn);
            this.game.hideMenu();
            resolve(conn);
          });

          conn.on('error', (error) => {
            console.error('Connection error:', error);
            this.game.connectionStatus.textContent = `Connection error: ${error.message}`;
            reject(error);
          });

          conn.on('close', () => {
            console.log('Connection closed');
            this.game.showMenu();
          });
        });

        this.peer.on('error', (error) => {
          console.error('Peer error:', error);
          if (error.type === 'network' || error.type === 'server-error') {
            this.game.connectionStatus.textContent = 'Network error. Please check your connection.';
          } else if (error.type === 'browser-incompatible') {
            this.game.connectionStatus.textContent = 'Browser not supported. Please use Chrome or Firefox.';
          } else {
            this.game.connectionStatus.textContent = `Connection error: ${error.type}`;
          }
          reject(error);
        });

      } catch (error) {
        console.error('Failed to join game:', error);
        this.game.connectionStatus.textContent = `Failed to join: ${error.message}`;
        reject(error);
      }
    });
  }

  setupPeerEventHandlers() {
    if (!this.peer) return;

    this.peer.on('connection', (conn) => {
      console.log('New peer trying to connect:', conn.peer);
      this.handleNewConnection(conn);
    });

    this.peer.on('disconnected', () => {
      console.log('Disconnected from server. Attempting to reconnect...');
      this.game.connectionStatus.textContent = 'Connection lost. Reconnecting...';
      this.attemptReconnection();
    });

    this.peer.on('close', () => {
      console.log('Connection closed');
      this.game.connectionStatus.textContent = 'Connection closed';
      this.game.showMenu();
      clearInterval(this.heartbeatInterval);
    });
  }

  checkHeartbeat() {
    const now = Date.now();
    if (now - this.lastHeartbeat > 10000) { // 10 seconds timeout
      console.log('Connection seems dead, attempting to reconnect...');
      this.attemptReconnection();
    }
  }

  attemptReconnection() {
    if (this.connectionAttempts < this.maxRetries) {
      this.connectionAttempts++;
      setTimeout(() => {
        console.log(`Reconnection attempt ${this.connectionAttempts}/${this.maxRetries}`);
        if (this.peer) {
          this.peer.reconnect();
        }
      }, 1000 * this.connectionAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.game.connectionStatus.textContent = 'Connection lost. Please refresh the page.';
      this.game.showMenu();
    }
  }

  handleNewConnection(conn) {
    try {
      conn.on('open', () => {
        this.connections.set(conn.peer, conn);
        
        if (this.isHost) {
          conn.send({
            type: 'world-state',
            data: this.game.world.serialize()
          });
        }
      });

      conn.on('data', (data) => {
        try {
          this.handleMessage(conn.peer, data);
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
        this.game.players.delete(conn.peer);
      });

      conn.on('error', (error) => {
        console.error('Connection error:', error);
        this.connections.delete(conn.peer);
        this.game.players.delete(conn.peer);
      });
    } catch (error) {
      console.error('Error in handleNewConnection:', error);
    }
  }

  handleMessage(peerId, message) {
    switch (message.type) {
      case 'player-update':
        this.updatePlayerState(peerId, message.data);
        break;
      case 'block-update':
        this.updateBlock(message.data);
        break;
      case 'world-state':
        if (!this.isHost) {
          this.game.world.deserialize(message.data);
        }
        break;
      case 'heartbeat':
        this.lastHeartbeat = Date.now();
        break;
    }
  }

  updatePlayerState(peerId, playerState) {
    let player = this.game.players.get(peerId);
    if (!player) {
      player = new Player();
      this.game.players.set(peerId, player);
    }
    player.position.copy(playerState.position);
    player.rotation.copy(playerState.rotation);
  }

  updateBlock(blockData) {
    this.game.world.updateBlock(blockData);
    if (this.isHost) {
      this.broadcast({
        type: 'block-update',
        data: blockData
      });
    }
  }

  broadcast(message) {
    this.connections.forEach(conn => conn.send(message));
    this.broadcastHeartbeat();
  }

  broadcastHeartbeat() {
    this.broadcast({
      type: 'heartbeat'
    });
  }

  update() {
    if (this.peer && this.connections.size > 0) {
      const playerState = {
        position: this.game.player.position,
        rotation: this.game.player.rotation
      };
      
      this.broadcast({
        type: 'player-update',
        data: playerState
      });
    }
  }
}