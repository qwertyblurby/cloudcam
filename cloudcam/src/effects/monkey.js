import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const MODE_FLOAT = 'float';
const MODE_FACE_TRACK = 'face-track';
const MODE_CORNER = 'corner';

const monkeyEffect = {
  name: 'monkey',

  threeRenderer: null,
  scene: null,
  camera: null,
  suzanne: null,
  pointLight: null,
  analyser: null,
  envMap: null,

  time: 0,
  driftX: 0,
  driftY: 0,
  driftVX: 0.002,
  driftVY: 0.0015,

  mode: MODE_FLOAT,
  monkeyScale: 0.9,
  loaded: false,

  MODE_FLOAT,
  MODE_FACE_TRACK,
  MODE_CORNER,

  async init(canvas, analyser) {
    this.analyser = analyser;
    this.time = 0;
    this.driftX = 0;
    this.driftY = 0;
    this.driftVX = 0.002;
    this.driftVY = 0.0015;
    this.mode = MODE_FLOAT;
    this.monkeyScale = 0.9;
    this.loaded = false;

    this.threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.threeRenderer.setSize(1280, 720);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio);
    this.threeRenderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
    this.camera.position.z = 3;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(2, 3, 2);
    this.scene.add(directionalLight);

    this.pointLight = new THREE.PointLight(0xff44aa, 2.0);
    this.pointLight.position.set(-2, 1, 1);
    this.scene.add(this.pointLight);

    const pmremGenerator = new THREE.PMREMGenerator(this.threeRenderer);
    const roomEnvironment = new RoomEnvironment();
    this.envMap = pmremGenerator.fromScene(roomEnvironment).texture;
    this.scene.environment = this.envMap;
    pmremGenerator.dispose();

    const loader = new GLTFLoader();

    await new Promise((resolve, reject) => {
      loader.load(
        '/models/Suzanne/glTF/Suzanne.gltf',
        (gltf) => {
          this.suzanne = gltf.scene;
          this.scene.add(this.suzanne);

          this.suzanne.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshPhysicalMaterial({
                metalness: 0.8,
                roughness: 0.15,
                color: 0xffffff,
                iridescence: 0.9,
                iridescenceIOR: 2.0,
                envMap: this.envMap,
              });
            }
          });

          this.suzanne.scale.setScalar(0.9);
          this.loaded = true;
          resolve();
        },
        undefined,
        (error) => {
          console.error('Failed to load Suzanne model:', error);
          reject(error);
        }
      );
    });
  },

  setMonkeyMode(mode) {
    this.mode = mode;
  },

  setMonkeyScale(v) {
    this.monkeyScale = v;
    if (this.suzanne) {
      this.suzanne.scale.setScalar(v);
    }
  },

  render(ctx, videoEl, dt) {
    if (!this.loaded || !this.suzanne || !this.threeRenderer) return;

    this.time += dt;

    if (this.mode === MODE_FLOAT) {
      this.driftX += this.driftVX * dt;
      this.driftY += this.driftVY * dt;

      if (Math.abs(this.driftX) > 0.5) {
        this.driftVX *= -1;
      }
      if (Math.abs(this.driftY) > 0.3) {
        this.driftVY *= -1;
      }

      this.suzanne.position.x = this.driftX;
      this.suzanne.position.y = this.driftY + Math.sin(this.time * 1.2) * 0.05;
    } else if (this.mode === MODE_FACE_TRACK) {
      const lastDetections =
        window.app?.lastFaceDetections ||
        window.app?.effects?.['emoji-filter']?.lastDetections ||
        [];

      if (lastDetections.length > 0) {
        const detection = lastDetections[0];
        const box = detection.detection.box;
        const landmarks = detection.landmarks;
        const jawOutline = landmarks.getJawOutline();
        const faceWidth = jawOutline[16].x - jawOutline[0].x;

        this.suzanne.position.x = (box.x + box.width / 2 - 640) / 640;
        this.suzanne.position.y = -(box.y + box.height / 2 - 360) / 360;
        this.suzanne.scale.setScalar(faceWidth * 0.014);
      } else {
        this.driftX += this.driftVX * dt;
        this.driftY += this.driftVY * dt;

        if (Math.abs(this.driftX) > 0.5) {
          this.driftVX *= -1;
        }
        if (Math.abs(this.driftY) > 0.3) {
          this.driftVY *= -1;
        }

        this.suzanne.position.x = this.driftX;
        this.suzanne.position.y = this.driftY + Math.sin(this.time * 1.2) * 0.05;
      }
    } else if (this.mode === MODE_CORNER) {
      this.suzanne.position.x = 0.8;
      this.suzanne.position.y = -0.6;
      this.suzanne.scale.setScalar(0.4);
    }

    this.suzanne.rotation.y += 0.008 * dt;
    this.suzanne.rotation.x = Math.sin(this.time * 0.7) * 0.15;

    if (this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      let bassSum = 0;
      const bassBins = Math.min(4, dataArray.length);
      for (let i = 0; i < bassBins; i++) {
        bassSum += dataArray[i];
      }
      const bass = bassBins > 0 ? bassSum / bassBins / 255 : 0;

      if (this.mode !== MODE_CORNER && this.mode !== MODE_FACE_TRACK) {
        this.suzanne.scale.setScalar(0.9 + bass * 0.4);
      }

      this.pointLight.intensity = 2.0 + bass * 4.0;
    }

    this.threeRenderer.render(this.scene, this.camera);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.threeRenderer.domElement, 0, 0, 1280, 720);
    ctx.restore();
  },

  destroy() {
    if (this.suzanne) {
      this.suzanne.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose?.();
          child.material?.dispose?.();
        }
      });
      this.scene?.remove(this.suzanne);
    }

    if (this.envMap) {
      this.envMap.dispose?.();
      this.envMap = null;
    }

    if (this.threeRenderer) {
      this.threeRenderer.dispose();
    }

    this.threeRenderer = null;
    this.scene = null;
    this.camera = null;
    this.suzanne = null;
    this.pointLight = null;
    this.analyser = null;
    this.loaded = false;
  },
};

export default monkeyEffect;