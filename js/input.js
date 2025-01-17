import * as THREE from 'three';

export class InputHandler {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.mouseLocked = false;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('click', (e) => this.handleClick(e));
    document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
  }

  handleKeyDown(e) {
    this.keys.add(e.code);
    
    if (e.code === 'Space') {
      this.game.player.jump();
    }

    if (e.code === 'Escape') {
      this.unlockPointer();
    }
  }

  handleKeyUp(e) {
    this.keys.delete(e.code);
  }

  handleMouseMove(e) {
    if (this.mouseLocked) {
      this.game.player.rotate(e.movementX, e.movementY);
    }
  }

  handleClick(e) {
    if (!this.mouseLocked) {
      this.lockPointer();
      return;
    }

    // Handle block placement/removal
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0);
    
    raycaster.setFromCamera(mouse, this.game.world.camera);
    // Implement block placement/removal logic
  }

  lockPointer() {
    document.getElementById('game-canvas').requestPointerLock();
  }

  unlockPointer() {
    document.exitPointerLock();
  }

  handlePointerLockChange() {
    this.mouseLocked = document.pointerLockElement === document.getElementById('game-canvas');
  }

  update() {
    if (!this.mouseLocked) return;

    const direction = new THREE.Vector3();
    
    if (this.keys.has('KeyW')) direction.z -= 1;
    if (this.keys.has('KeyS')) direction.z += 1;
    if (this.keys.has('KeyA')) direction.x -= 1;
    if (this.keys.has('KeyD')) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      direction.applyEuler(new THREE.Euler(0, this.game.player.rotation.y, 0));
      this.game.player.move(direction);
    }
  }
}