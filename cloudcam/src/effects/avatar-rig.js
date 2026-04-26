import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const avatarRigEffect = {
  name: 'avatar-rig',

  // Three.js setup
  threeRenderer: null,
  threeScene: null,
  threeCamera: null,
  gltfLoader: null,

  // Model
  model: null,
  skeleton: null,
  boneMap: {},
  modelPath: '/models/panda.glb',

  // Tracking
  trackingEffect: null,

  // Model normalization
  baseModelScale: 1.0,

  // Head anchor (local space)
  headAnchorLocal: new THREE.Vector3(),
  headAnchorReady: false,

  // Smoothed state - position
  currentPosition: new THREE.Vector3(0, 0, -4.8),
  targetPosition: new THREE.Vector3(0, 0, -4.8),

  // Smoothed state - scale
  currentScale: 1.0,
  targetScale: 1.0,

  // Smoothed state - rotation (for head/neck bones)
  headNeutralQuaternion: null,
  neckNeutralQuaternion: null,

  // Face rig configuration
  faceRigConfig: {
    // Position mapping
    xStrength: 3.2,
    yStrength: 2.5,

    // Depth mapping
    zBase: -4.8,
    zGain: 10.0,
    zMin: -5.8,
    zMax: -1.7,

    // Scale mapping
    widthGain: 6.0,
    minScale: 0.55,
    maxScale: 1.8,

    // Hand scaling
    handWidthGain: 4.0,
    handInfluence: 0.3, // How much hand scale affects total scale (0-1)

    // Smoothing factors
    positionLerp: 0.18,
    rotationLerp: 0.15,
    scaleLerp: 0.16,

    // Head rotation gains
    headYawGain: 1.0,
    headPitchGain: 0.9,
    headRollGain: 1.0,

    // Neck influence (partial of head rotation)
    neckInfluence: 0.35,
  },

  // Fine-tuning calibration constants (adjust these for better alignment)
  calibration: {
    // Position offsets (applied to desired head position)
    faceAnchorOffsetX: 0.0,
    faceAnchorOffsetY: 0.0,
    faceAnchorOffsetZ: 0.0,

    // Scale multiplier (1.0 = no change)
    faceScaleMultiplier: 1.0,

    // Rotation multipliers (1.0 = full effect, 0.0 = no rotation)
    headRotationMultiplier: 0.85,
    neckRotationMultiplier: 0.30,
  },

  // Debug log throttling
  _lastLogTime: 0,
  _logInterval: 1000, // 1 second

  /**
   * Initialize the effect
   */
  async init(canvas, analyser) {
    try {
      console.log('[Avatar Rig] Initializing face-anchor avatar...');

      // Initialize Three.js renderer (offscreen, transparent)
      this.threeRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      this.threeRenderer.setSize(1280, 720);
      this.threeRenderer.setPixelRatio(window.devicePixelRatio);

      // Create scene
      this.threeScene = new THREE.Scene();

      // Create camera
      this.threeCamera = new THREE.PerspectiveCamera(45, 1280 / 720, 0.1, 100);
      this.threeCamera.position.set(0, 0, 5);

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
      this.threeScene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(4, 6, 6);
      this.threeScene.add(directionalLight);

      // Initialize GLTF loader
      this.gltfLoader = new GLTFLoader();

      // Load the model
      await this.loadModel();

      console.log('[Avatar Rig] Face-anchor avatar ready');
    } catch (error) {
      console.error('[Avatar Rig] Failed to initialize:', error);
      throw error;
    }
  },

  /**
   * Load the rigged GLB/GLTF model
   */
  async loadModel() {
    return new Promise((resolve, reject) => {
      console.log(`[Avatar Rig] Loading model from: ${this.modelPath}`);

      this.gltfLoader.load(
        this.modelPath,
        (gltf) => {
          this.model = gltf.scene;

          // Find skeleton and bones
          this.findSkeletonAndBones();

          // Normalize model size and position
          this.normalizeModel();

          // Compute head anchor from model bones
          this.computeHeadAnchor();

          // Add model to scene
          this.threeScene.add(this.model);

          // Store neutral quaternions for head/neck
          if (this.boneMap.head) {
            this.headNeutralQuaternion = this.boneMap.head.quaternion.clone();
          }
          if (this.boneMap.neck) {
            this.neckNeutralQuaternion = this.boneMap.neck.quaternion.clone();
          }

          console.log('[Avatar Rig] Model added to scene');
          resolve();
        },
        undefined,
        (error) => {
          console.error('[Avatar Rig] Error loading model:', error);
          reject(error);
        }
      );
    });
  },

  /**
   * Find skeleton and map head/neck/hips bones
   */
  findSkeletonAndBones() {
    this.skeleton = null;
    this.boneMap = {};

    this.model.traverse((node) => {
      if (node.isSkinnedMesh && node.skeleton && !this.skeleton) {
        this.skeleton = node.skeleton;
      }
    });

    if (!this.skeleton) {
      console.warn('[Avatar Rig] No skeleton found');
      return;
    }

    console.log('[Avatar Rig] Skeleton bones:');
    this.skeleton.bones.forEach((bone, index) => {
      console.log(`  [${index}] ${bone.name}`);
    });

    // Map head, neck, and hips bones
    for (const bone of this.skeleton.bones) {
      const lower = bone.name.toLowerCase();

      if (!this.boneMap.head && lower.includes('head')) {
        this.boneMap.head = bone;
      }
      if (!this.boneMap.neck && lower.includes('neck')) {
        this.boneMap.neck = bone;
      }
      if (!this.boneMap.hips && (lower.includes('hip') || lower.includes('pelvis') || lower.includes('root'))) {
        this.boneMap.hips = bone;
      }
    }

    console.log('[Avatar Rig] Bone map:', {
      head: this.boneMap.head?.name || null,
      neck: this.boneMap.neck?.name || null,
      hips: this.boneMap.hips?.name || null,
    });
  },

  /**
   * Normalize model size and recenter
   */
  normalizeModel() {
    if (!this.model) return;

    const bbox = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    bbox.getSize(size);
    bbox.getCenter(center);

    const targetHeight = 2.5;
    this.baseModelScale = targetHeight / Math.max(size.y, 0.0001);

    this.model.scale.setScalar(this.baseModelScale);

    const scaledBox = new THREE.Box3().setFromObject(this.model);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    this.model.position.set(
      -scaledCenter.x,
      -scaledCenter.y,
      this.faceRigConfig.zBase
    );

    this.currentPosition.copy(this.model.position);
    this.targetPosition.copy(this.model.position);

    this.currentScale = 1.0;
    this.targetScale = 1.0;

    console.log('[Avatar Rig] Normalized model', {
      baseModelScale: this.baseModelScale,
      targetHeight,
    });
  },

  /**
   * Compute head anchor from model bones
   * Preferred: head bone > neck bone + offset > bounding box top
   * Uses getWorldPosition and worldToLocal for correct coordinate space
   */
  computeHeadAnchor() {
    if (!this.model) return;

    // Update model world matrix to ensure correct transforms
    this.model.updateMatrixWorld();

    const tempWorldPos = new THREE.Vector3();
    let anchorSource = 'none';

    // Prefer head bone position with offset to top of head
    if (this.boneMap.head) {
      this.boneMap.head.getWorldPosition(tempWorldPos);
      this.model.worldToLocal(tempWorldPos);
      this.headAnchorLocal.copy(tempWorldPos);
      this.headAnchorLocal.y += 0.25; // Offset to top of head
      anchorSource = 'head bone';
      this.headAnchorReady = true;
      console.log('[Avatar Rig] Head anchor from head bone (top):', this.headAnchorLocal);
      return;
    }

    // Fallback to neck bone position with upward offset to top of head
    if (this.boneMap.neck) {
      this.boneMap.neck.getWorldPosition(tempWorldPos);
      this.model.worldToLocal(tempWorldPos);
      this.headAnchorLocal.copy(tempWorldPos);
      this.headAnchorLocal.y += 0.4; // Larger offset to reach top of head
      anchorSource = 'neck bone';
      this.headAnchorReady = true;
      console.log('[Avatar Rig] Head anchor from neck bone (top):', this.headAnchorLocal);
      return;
    }

    // Fallback to bounding box at very top of model
    const bbox = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Use top of bounding box (100% of model height)
    this.headAnchorLocal.set(0, size.y, 0);
    anchorSource = 'bounding box';
    this.headAnchorReady = true;
    console.log('[Avatar Rig] Head anchor from bounding box top:', this.headAnchorLocal);
  },

  /**
   * Set the tracking effect reference
   */
  setTrackingEffect(effect) {
    this.trackingEffect = effect;
    console.log('[Avatar Rig] Tracking connected');
  },

  /**
   * Get tracking service (prefer trackingEffect, fallback to window.app.trackingService)
   */
  getTracking() {
    return this.trackingEffect || window.app?.trackingService || null;
  },

  /**
   * Get face landmarks from tracking service
   */
  getFaceLandmarks() {
    const tracking = this.getTracking();
    if (!tracking?.lastFaceResults?.faceLandmarks?.length) {
      return null;
    }
    return tracking.lastFaceResults.faceLandmarks[0];
  },

  /**
   * Get hand landmarks from tracking service
   */
  getHandLandmarks() {
    const tracking = this.getTracking();
    if (!tracking?.lastHandResults?.landmarks?.length) {
      return null;
    }
    return tracking.lastHandResults.landmarks;
  },

  /**
   * Compute hand size from landmarks (wrist to middle finger tip)
   * Returns average hand width across all detected hands
   */
  computeHandSize(handLandmarks) {
    if (!handLandmarks || handLandmarks.length === 0) return null;

    let totalHandWidth = 0;
    let handCount = 0;

    for (const hand of handLandmarks) {
      if (!hand || hand.length < 21) continue;

      // Landmark 0: wrist
      // Landmark 12: middle finger tip
      const wrist = hand[0];
      const middleTip = hand[12];

      if (wrist && middleTip) {
        const dx = middleTip.x - wrist.x;
        const dy = middleTip.y - wrist.y;
        const handWidth = Math.sqrt(dx * dx + dy * dy);
        totalHandWidth += handWidth;
        handCount++;
      }
    }

    if (handCount === 0) return null;
    return totalHandWidth / handCount;
  },

  /**
   * Compute compact face pose from landmarks
   * Returns: centerX, centerY, faceSize, yaw, pitch, roll
   */
  computeFacePose(faceLandmarks) {
    if (!faceLandmarks || faceLandmarks.length === 0) return null;

    // Compute bounding box
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const lm of faceLandmarks) {
      minX = Math.min(minX, lm.x);
      maxX = Math.max(maxX, lm.x);
      minY = Math.min(minY, lm.y);
      maxY = Math.max(maxY, lm.y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const faceSize = Math.max(faceWidth, faceHeight);

    // Get key landmarks for rotation estimation and face width
    const leftEye = faceLandmarks[33];
    const rightEye = faceLandmarks[263];
    const noseTip = faceLandmarks[1];
    const mouthTop = faceLandmarks[13];
    const leftCheek = faceLandmarks[234];
    const rightCheek = faceLandmarks[454];

    // Compute face width as Euclidean distance between landmarks 234 and 454
    let faceWidthDistance = faceWidth; // fallback to bbox width
    if (leftCheek && rightCheek) {
      const dx = rightCheek.x - leftCheek.x;
      const dy = rightCheek.y - leftCheek.y;
      faceWidthDistance = Math.sqrt(dx * dx + dy * dy);
    }

    let roll = 0, yaw = 0, pitch = 0;

    // Roll: angle between eyes
    if (leftEye && rightEye) {
      roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    }

    // Yaw: nose relative to face center/cheeks
    if (leftCheek && rightCheek && noseTip) {
      const faceMidX = (leftCheek.x + rightCheek.x) / 2;
      yaw = (noseTip.x - faceMidX) * 8.0;
    } else {
      yaw = (0.5 - centerX) * 1.2;
    }

    // Pitch: eye/nose/mouth relationship
    if (leftEye && rightEye && noseTip && mouthTop) {
      const eyeCenterY = (leftEye.y + rightEye.y) / 2;
      const eyeToMouth = mouthTop.y - eyeCenterY;
      const eyeToNose = noseTip.y - eyeCenterY;
      if (Math.abs(eyeToMouth) > 1e-5) {
        pitch = (eyeToNose / eyeToMouth - 0.42) * 3.0;
      }
    }

    // Clamp to natural ranges
    yaw = THREE.MathUtils.clamp(yaw, -0.7, 0.7);
    pitch = THREE.MathUtils.clamp(pitch, -0.45, 0.45);
    roll = THREE.MathUtils.clamp(roll, -0.45, 0.45);

    return {
      centerX,
      centerY,
      faceSize,
      faceWidthDistance,
      yaw,
      pitch,
      roll,
    };
  },

  /**
   * Update model position and scale using head-anchor alignment
   */
  updateModelFromFace(facePose) {
    if (!this.model || !facePose || !this.headAnchorReady) return;

    const cfg = this.faceRigConfig;
    const cal = this.calibration;

    // Check for invalid values
    if (!isFinite(facePose.centerX) || !isFinite(facePose.centerY) || !isFinite(facePose.faceSize)) {
      console.warn('[Avatar Rig] Invalid face pose values, skipping update');
      return;
    }

    // Update model world matrix to ensure correct transforms
    this.model.updateMatrixWorld();

    // Compute current head anchor world position
    const currentHeadWorld = this.headAnchorLocal.clone().applyMatrix4(this.model.matrixWorld);

    // Check for invalid head anchor
    if (!isFinite(currentHeadWorld.x) || !isFinite(currentHeadWorld.y) || !isFinite(currentHeadWorld.z)) {
      console.warn('[Avatar Rig] Invalid head anchor world position, skipping update');
      return;
    }

    // Compute desired head world position from face tracking (scene space)
    const desiredHeadX = (facePose.centerX - 0.5) * cfg.xStrength + cal.faceAnchorOffsetX;
    const desiredHeadY = -(facePose.centerY - 0.5) * cfg.yStrength + cal.faceAnchorOffsetY; // Single Y inversion for screen-to-scene
    const desiredHeadZ = THREE.MathUtils.clamp(
      cfg.zBase + facePose.faceSize * cfg.zGain + cal.faceAnchorOffsetZ,
      cfg.zMin,
      cfg.zMax
    );

    const desiredHeadWorld = new THREE.Vector3(desiredHeadX, desiredHeadY, desiredHeadZ);

    // Compute delta in world space (same coordinate space)
    const delta = new THREE.Vector3().subVectors(desiredHeadWorld, currentHeadWorld);

    // Check for invalid delta
    if (!isFinite(delta.x) || !isFinite(delta.y) || !isFinite(delta.z)) {
      console.warn('[Avatar Rig] Invalid delta, skipping update');
      return;
    }

    // Move model so head anchor lands on tracked face position
    this.targetPosition.copy(this.model.position).add(delta);

    // Smooth position
    this.currentPosition.lerp(this.targetPosition, cfg.positionLerp);
    this.model.position.copy(this.currentPosition);

    // Update scale using face width distance (Euclidean distance between landmarks 234 and 454)
    let faceScale = facePose.faceWidthDistance * cfg.widthGain * cal.faceScaleMultiplier;

    // Get hand landmarks and compute hand-based scale
    const handLandmarks = this.getHandLandmarks();
    const handSize = this.computeHandSize(handLandmarks);
    let handScale = 0;
    let handsDetected = false;

    if (handSize !== null) {
      handScale = handSize * cfg.handWidthGain * cal.faceScaleMultiplier;
      handsDetected = true;
    }

    // Blend face and hand scales
    let blendedScale;
    if (handsDetected) {
      // When hands are detected, blend face and hand scales
      blendedScale = faceScale * (1 - cfg.handInfluence) + handScale * cfg.handInfluence;
    } else {
      // Face-only scaling
      blendedScale = faceScale;
    }

    this.targetScale = THREE.MathUtils.clamp(
      blendedScale,
      cfg.minScale,
      cfg.maxScale
    );

    // Smooth scale
    this.currentScale = THREE.MathUtils.lerp(
      this.currentScale,
      this.targetScale,
      cfg.scaleLerp
    );

    this.model.scale.setScalar(this.baseModelScale * this.currentScale);

    // Throttled debug log (concise)
    const now = Date.now();
    if (now - this._lastLogTime > this._logInterval) {
      console.log('[Avatar Rig] Face center:', facePose.centerX.toFixed(3), facePose.centerY.toFixed(3));
      console.log('[Avatar Rig] Model position:', this.model.position.toArray().map(v => v.toFixed(3)));
      console.log('[Avatar Rig] Model scale:', this.currentScale.toFixed(3));
      console.log('[Avatar Rig] Scaling debug:', {
        faceWidthDistance: facePose.faceWidthDistance.toFixed(4),
        faceScale: faceScale.toFixed(4),
        handsDetected,
        handSize: handSize !== null ? handSize.toFixed(4) : 'N/A',
        handScale: handScale.toFixed(4),
        blendedScale: blendedScale.toFixed(4),
        targetScale: this.targetScale.toFixed(4),
      });
      this._lastLogTime = now;
    }
  },

  /**
   * Update head and neck bone rotations
   */
  updateHeadAndNeck(facePose) {
    if (!facePose) return;

    const cfg = this.faceRigConfig;
    const cal = this.calibration;

    const yaw = facePose.yaw * cfg.headYawGain * cal.headRotationMultiplier;
    const pitch = facePose.pitch * cfg.headPitchGain * cal.headRotationMultiplier;
    const roll = facePose.roll * cfg.headRollGain * cal.headRotationMultiplier;

    // Log missing bones/quaternions once
    if (!this._loggedBoneStatus) {
      console.log('[Avatar Rig] Head/neck status:', {
        headBone: !!this.boneMap.head,
        neckBone: !!this.boneMap.neck,
        headNeutral: !!this.headNeutralQuaternion,
        neckNeutral: !!this.neckNeutralQuaternion,
      });
      this._loggedBoneStatus = true;
    }

    // Apply subtle rotation to head bone
    if (this.boneMap.head && this.headNeutralQuaternion) {
      try {
        const headEuler = new THREE.Euler(pitch, yaw, roll, 'XYZ');
        const headDelta = new THREE.Quaternion().setFromEuler(headEuler);
        const targetHeadQuat = this.headNeutralQuaternion.clone().multiply(headDelta);

        this.boneMap.head.quaternion.slerp(targetHeadQuat, cfg.rotationLerp);
      } catch (error) {
        console.warn('[Avatar Rig] Head rotation error:', error);
      }
    }

    // Apply subtle rotation to neck bone
    if (this.boneMap.neck && this.neckNeutralQuaternion) {
      try {
        const neckEuler = new THREE.Euler(
          pitch * cfg.neckInfluence * cal.neckRotationMultiplier,
          yaw * cfg.neckInfluence * cal.neckRotationMultiplier,
          roll * cfg.neckInfluence * cal.neckRotationMultiplier,
          'XYZ'
        );
        const neckDelta = new THREE.Quaternion().setFromEuler(neckEuler);
        const targetNeckQuat = this.neckNeutralQuaternion.clone().multiply(neckDelta);

        this.boneMap.neck.quaternion.slerp(targetNeckQuat, cfg.rotationLerp);
      } catch (error) {
        console.warn('[Avatar Rig] Neck rotation error:', error);
      }
    }
  },

  /**
   * Render the effect
   */
  render(ctx, videoEl, dt) {
    try {
      // Get face landmarks (primary driver)
      const faceLandmarks = this.getFaceLandmarks();

      if (faceLandmarks) {
        // Compute face pose
        const facePose = this.computeFacePose(faceLandmarks);
        
        if (facePose) {
          // Update model position/scale using head-anchor alignment
          this.updateModelFromFace(facePose);
          
          // Update head/neck bone rotations
          this.updateHeadAndNeck(facePose);
        }
      }
      // If face landmarks missing, fail gracefully and keep current pose

      // Render the Three.js scene
      this.threeRenderer.render(this.threeScene, this.threeCamera);

      // Composite the 3D avatar over the webcam
      ctx.drawImage(this.threeRenderer.domElement, 0, 0, 1280, 720);
    } catch (error) {
      console.error('[Avatar Rig] Render error:', error);
      // Still render the scene even if tracking fails
      if (this.threeRenderer && this.threeScene && this.threeCamera) {
        this.threeRenderer.render(this.threeScene, this.threeCamera);
        ctx.drawImage(this.threeRenderer.domElement, 0, 0, 1280, 720);
      }
    }
  },

  /**
   * Clean up resources
   */
  destroy() {
    console.log('[Avatar Rig] Destroying...');

    if (this.threeRenderer) {
      this.threeRenderer.dispose();
      this.threeRenderer = null;
    }

    if (this.model && this.threeScene) {
      this.threeScene.remove(this.model);
    }

    this.model = null;
    this.skeleton = null;
    this.boneMap = {};
    this.headNeutralQuaternion = null;
    this.neckNeutralQuaternion = null;
    this.trackingEffect = null;
    this.headAnchorReady = false;
  },
};

export default avatarRigEffect;