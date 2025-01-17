import * as THREE from 'three';

export class Player {
  constructor() {
    this.position = new THREE.Vector3(0, 10, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.speed = 0.1;
    this.jumpForce = 0.5;
    this.gravity = -0.02;
    this.onGround = false;
  }

  update() {
    // Apply gravity
    this.velocity.y += this.gravity;
    
    // Update position
    this.position.add(this.velocity);
    
    // Simple collision detection with ground
    if (this.position.y <= 1) {
      this.position.y = 1;
      this.velocity.y = 0;
      this.onGround = true;
    }
  }

  move(direction) {
    const moveVector = new THREE.Vector3();
    moveVector.copy(direction).multiplyScalar(this.speed);
    this.velocity.add(moveVector);
  }

  jump() {
    if (this.onGround) {
      this.velocity.y = this.jumpForce;
      this.onGround = false;
    }
  }

  rotate(dx, dy) {
    this.rotation.y -= dx * 0.002;
    this.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotation.x - dy * 0.002));
  }
}