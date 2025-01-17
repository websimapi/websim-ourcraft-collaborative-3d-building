export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.connections = new Map();
    this.isHost = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  async hostGame() {
    try {
      this.peer = new Peer({
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        }
      });

      return new Promise((resolve, reject) => {
        this.peer.on('open', (id) => {
          this.isHost = true;
          this.game.connectionStatus.textContent = `Your host ID: ${id}`;
          this.game.hideMenu();
          this.setupPeerErrorHandlers();
          resolve(id);
        });

        this.peer.on('error', (error) => {
          console.error('Peer connection error:', error);
          reject(error);
        });

        this.peer.on('connection', (conn) => {
          this.handleNewConnection(conn);
        });
      });
    } catch (error) {
      console.error('Failed to create peer:', error);
      throw error;
    }
  }

  async joinGame(hostId) {
    try {
      this.peer = new Peer({
        debug: 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        }
      });

      return new Promise((resolve, reject) => {
        this.peer.on('open', () => {
          const conn = this.peer.connect(hostId, {
            reliable: true
          });
          
          conn.on('open', () => {
            this.handleNewConnection(conn);
            this.game.hideMenu();
            resolve(conn);
          });

          conn.on('error', (error) => {
            console.error('Connection error:', error);
            reject(error);
          });
        });

        this.peer.on('error', (error) => {
          console.error('Peer connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to join game:', error);
      throw error;
    }
  }

  setupPeerErrorHandlers() {
    this.peer.on('disconnected', () => {
      console.log('Peer disconnected - attempting to reconnect...');
      if (this.connectionAttempts < this.maxRetries) {
        this.connectionAttempts++;
        this.peer.reconnect();
      } else {
        console.error('Max reconnection attempts reached');
        this.game.showMenu();
      }
    });

    this.peer.on('close', () => {
      console.log('Peer connection closed');
      this.game.showMenu();
    });
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
      // Broadcast to all other players
      this.broadcast({
        type: 'block-update',
        data: blockData
      });
    }
  }

  broadcast(message) {
    this.connections.forEach(conn => conn.send(message));
  }

  update() {
    // Send player state to all connected peers
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