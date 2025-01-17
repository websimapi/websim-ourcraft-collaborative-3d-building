import { World } from './world.js';
import { Player } from './player.js';
import { NetworkManager } from './network.js';
import { InputHandler } from './input.js';
import { BlockTypes } from './blocks.js';

class Game {
  constructor() {
    this.world = new World();
    this.player = new Player();
    this.networkManager = new NetworkManager(this);
    this.inputHandler = new InputHandler(this);
    this.players = new Map();
    
    this.setupDOMElements();
    this.init();
  }

  setupDOMElements() {
    this.menu = document.getElementById('menu');
    this.hostButton = document.getElementById('host-game');
    this.joinButton = document.getElementById('join-game');
    this.hostIdInput = document.getElementById('host-id');
    this.connectionStatus = document.getElementById('connection-status');

    this.hostButton.addEventListener('click', () => this.networkManager.hostGame());
    this.joinButton.addEventListener('click', () => {
      const hostId = this.hostIdInput.value;
      if (hostId) {
        this.networkManager.joinGame(hostId);
      }
    });
  }

  init() {
    this.world.generate();
    this.gameLoop();
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    this.player.update();
    this.world.update();
    this.networkManager.update();
  }

  render() {
    this.world.render();
    this.players.forEach(player => player.render());
  }

  hideMenu() {
    this.menu.classList.add('hidden');
    this.inputHandler.lockPointer();
  }

  showMenu() {
    this.menu.classList.remove('hidden');
    this.inputHandler.unlockPointer();
  }
}

window.game = new Game();