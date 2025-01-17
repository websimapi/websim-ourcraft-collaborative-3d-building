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
    
    // Improved error handling
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    window.addEventListener('error', this.handleGlobalError.bind(this));
    
    this.setupDOMElements();
    this.init();
  }

  handleUnhandledRejection(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // More specific error messages
    let errorMessage = 'Connection error. Please try again.';
    if (event.reason?.type === 'peer-unavailable') {
      errorMessage = 'Could not find the specified host. Please check the ID.';
    } else if (event.reason?.type === 'network') {
      errorMessage = 'Network connection failed. Please check your internet connection.';
    } else if (event.reason?.type === 'server-error') {
      errorMessage = 'Server error. Please try again later.';
    }
    
    this.connectionStatus.textContent = errorMessage;
    event.preventDefault();
  }

  handleGlobalError(event) {
    console.error('Global error:', event.error);
    this.connectionStatus.textContent = 'An error occurred. Please refresh the page.';
    event.preventDefault();
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
        this.hostButton.disabled = true;
        await this.networkManager.hostGame();
      } catch (error) {
        console.error('Failed to host game:', error);
        this.connectionStatus.textContent = `Failed to host game: ${error.message}`;
      } finally {
        this.hostButton.disabled = false;
      }
    });

    this.joinButton.addEventListener('click', async () => {
      const hostId = this.hostIdInput.value.trim();
      if (hostId) {
        try {
          this.connectionStatus.textContent = 'Connecting...';
          this.joinButton.disabled = true;
          await this.networkManager.joinGame(hostId);
        } catch (error) {
          console.error('Failed to join game:', error);
          this.connectionStatus.textContent = `Failed to join game: ${error.message}`;
        } finally {
          this.joinButton.disabled = false;
        }
      } else {
        this.connectionStatus.textContent = 'Please enter a Host ID';
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

// Wait for both DOM and resources to load
window.addEventListener('load', () => {
  try {
    window.game = new Game();
  } catch (error) {
    console.error('Failed to start game:', error);
    const status = document.getElementById('connection-status');
    if (status) {
      status.textContent = `Failed to start game: ${error.message}`;
    }
  }
});