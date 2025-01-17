import * as THREE from 'three';
import { BlockTypes } from './blocks.js';

export class World {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('game-canvas'),
      antialias: true
    });
    
    this.chunks = new Map();
    this.chunkSize = 16;
    this.setupRenderer();
    this.setupLighting();
  }

  setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB); // Sky blue
    window.addEventListener('resize', () => this.handleResize());
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    this.scene.add(ambientLight, directionalLight);
  }

  generate() {
    // Generate initial chunks around spawn point
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        this.generateChunk(x, z);
      }
    }
  }

  generateChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    if (this.chunks.has(key)) return;

    const chunk = {
      blocks: new Map(),
      mesh: null
    };

    // Simple terrain generation
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const worldX = chunkX * this.chunkSize + x;
        const worldZ = chunkZ * this.chunkSize + z;
        const height = Math.floor(
          (Math.sin(worldX * 0.1) + Math.cos(worldZ * 0.1)) * 2 + 4
        );

        for (let y = 0; y <= height; y++) {
          const type = y === height ? BlockTypes.GRASS :
                      y === height - 1 ? BlockTypes.DIRT :
                      BlockTypes.STONE;
          chunk.blocks.set(`${x},${y},${z}`, type);
        }
      }
    }

    this.chunks.set(key, chunk);
    this.updateChunkMesh(chunk);
  }

  updateChunkMesh(chunk) {
    // Create geometry for the chunk
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const materials = new Map();
    const meshes = [];

    chunk.blocks.forEach((type, pos) => {
      const [x, y, z] = pos.split(',').map(Number);
      if (!materials.has(type)) {
        materials.set(type, new THREE.MeshLambertMaterial({ color: type.color }));
      }
      
      const mesh = new THREE.Mesh(geometry, materials.get(type));
      mesh.position.set(x, y, z);
      meshes.push(mesh);
    });

    chunk.mesh = new THREE.Group();
    meshes.forEach(mesh => chunk.mesh.add(mesh));
    this.scene.add(chunk.mesh);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update() {
    // Update chunks based on player position
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}