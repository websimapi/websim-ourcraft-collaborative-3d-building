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

    this.hostButton.addEventListener('click', async () => {
      try {
        this.connectionStatus.textContent = 'Connecting...';
        await this.networkManager.hostGame();
      } catch (error) {
        console.error('Failed to host game:', error);
        this.connectionStatus.textContent = 'Failed to host game. Please try again.';
      }
    });

    this.joinButton.addEventListener('click', async () => {
      const hostId = this.hostIdInput.value;
      if (hostId) {
        try {
          this.connectionStatus.textContent = 'Connecting...';
          await this.networkManager.joinGame(hostId);
        } catch (error) {
          console.error('Failed to join game:', error);
          this.connectionStatus.textContent = 'Failed to join game. Please check the Host ID and try again.';
        }
      }
    });
  }

  init() {
    try {
      this.world.generate();
      this.gameLoop();
    } catch (error) {
      console.error('Error initializing game:', error);
      this.connectionStatus.textContent = 'Failed to initialize game. Please refresh the page.';
    }
  }

  gameLoop() {
    try {
      this.update();
      this.render();
      requestAnimationFrame(() => this.gameLoop());
    } catch (error) {
      console.error('Error in game loop:', error);
    }
  }

  update() {
    this.player.update();
    this.world.update();
    this.networkManager.update();
  }

  render() {
    this.world.render();
    this.players.forEach(player => {
      try {
        player.render();
      } catch (error) {
        console.error('Error rendering player:', error);
      }
    });
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

// Ensure the DOM is loaded before starting the game
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.game = new Game();
  } catch (error) {
    console.error('Failed to start game:', error);
    document.getElementById('connection-status').textContent = 
      'Failed to start game. Please refresh the page.';
  }
});