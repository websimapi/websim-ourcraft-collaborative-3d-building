export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.connections = new Map();
    this.isHost = false;
  }

  hostGame() {
    this.peer = new Peer();
    this.isHost = true;

    this.peer.on('open', (id) => {
      this.game.connectionStatus.textContent = `Your host ID: ${id}`;
      this.game.hideMenu();
    });

    this.peer.on('connection', (conn) => {
      this.handleNewConnection(conn);
    });
  }

  joinGame(hostId) {
    this.peer = new Peer();
    this.isHost = false;

    this.peer.on('open', () => {
      const conn = this.peer.connect(hostId);
      this.handleNewConnection(conn);
    });
  }

  handleNewConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      
      if (this.isHost) {
        // Send current world state
        conn.send({
          type: 'world-state',
          data: this.game.world.serialize()
        });
      }
    });

    conn.on('data', (data) => {
      this.handleMessage(conn.peer, data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.game.players.delete(conn.peer);
    });
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