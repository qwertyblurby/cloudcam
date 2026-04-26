import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const blobEffect = {
  name: 'blob',
  time: 0,
  blobOpacity: 0.85,

  init(canvas, analyser) {
    this.canvas = canvas;
    this.analyser = analyser;

    this.threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    this.threeRenderer.setSize(1280, 720);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio);
    this.threeRenderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    this.camera.position.z = 4;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(2, 2, 2);
    this.scene.add(pointLight);

    this.marchingCubes = new MarchingCubes(
      28,
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0,
        transmission: 1.0,
        thickness: 1.5,
        iridescence: 1.0,
        iridescenceIOR: 1.8,
        envMapIntensity: 1.5,
      }),
      true,
      true,
      100000
    );

    this.marchingCubes.isolation = 80;
    this.scene.add(this.marchingCubes);

    const pmremGenerator = new THREE.PMREMGenerator(this.threeRenderer);
    const roomEnvironment = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnvironment).texture;

    this.scene.environment = envMap;
    this.marchingCubes.material.envMap = envMap;

    pmremGenerator.dispose();
  },

  render(ctx, videoEl, dt) {
    if (!this.marchingCubes || !this.threeRenderer) return;

    this.time += dt;
    this.marchingCubes.reset();

    const speed = 1.5;
    const phaseOffsets = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

    for (let i = 0; i < 4; i++) {
      const phase = phaseOffsets[i];
      const x = Math.sin(this.time * speed + phase) * 0.4;
      const y = Math.cos(this.time * speed * 0.8 + phase) * 0.4;
      const z = Math.sin(this.time * speed * 0.6 + phase) * 0.4;

      let strength = 0.5;

      if (this.analyser) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        const bassBins = Math.min(5, dataArray.length);
        let bassSum = 0;
        for (let j = 0; j < bassBins; j++) {
          bassSum += dataArray[j];
        }

        const bass = bassBins > 0 ? bassSum / bassBins / 255 : 0;
        strength *= 1 + bass * 0.8;
      }

      this.marchingCubes.addBall(x, y, z, strength, 0);
    }

    this.threeRenderer.render(this.scene, this.camera);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = this.blobOpacity;
    ctx.drawImage(this.threeRenderer.domElement, 0, 0, 1280, 720);
    ctx.restore();
  },

  destroy() {
    if (this.marchingCubes) {
      this.marchingCubes.material?.dispose?.();
      this.scene?.remove?.(this.marchingCubes);
    }

    if (this.threeRenderer) {
      this.threeRenderer.dispose();
    }
  },
};

export default blobEffect;