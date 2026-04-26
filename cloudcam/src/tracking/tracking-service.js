import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { HandLandmarker } from '@mediapipe/tasks-vision';
import { PoseLandmarker } from '@mediapipe/tasks-vision';

const trackingService = {
  // MediaPipe landmarkers
  faceLandmarker: null,
  handLandmarker: null,
  poseLandmarker: null,

  // Video element for detection
  videoEl: null,

  // Detection loop
  detectionInterval: 50,
  detectionTimeout: null,

  // Latest tracking results
  lastFaceResults: null,
  lastHandResults: null,
  lastPoseResults: null,

  // State
  isReady: false,
  isDetecting: false,

  /**
   * Initialize the tracking service
   * Loads MediaPipe models and prepares for detection
   */
  async init() {
    this.isReady = false;
    this.isDetecting = false;
    this.lastFaceResults = null;
    this.lastHandResults = null;
    this.lastPoseResults = null;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      this.isReady = true;
      console.log('[Tracking Service] Initialized successfully');
    } catch (error) {
      console.error('[Tracking Service] Failed to initialize MediaPipe landmarkers:', error);
      this.isReady = false;
    }
  },

  /**
   * Start the detection loop with the provided video element
   */
  startDetectionLoop(videoEl) {
    if (!this.isReady || this.isDetecting) return;
    this.videoEl = videoEl;
    this.isDetecting = true;
    console.log('[Tracking Service] Starting detection loop');
    this.runDetection();
  },

  /**
   * Run a single detection cycle
   * Called repeatedly via setTimeout
   */
  async runDetection() {
    if (!this.isReady || !this.videoEl) {
      this.isDetecting = false;
      return;
    }

    try {
      const timestamp = performance.now();

      if (this.faceLandmarker) {
        this.lastFaceResults = this.faceLandmarker.detectForVideo(this.videoEl, timestamp);
      }

      if (this.handLandmarker) {
        this.lastHandResults = this.handLandmarker.detectForVideo(this.videoEl, timestamp);
      }

      if (this.poseLandmarker) {
        this.lastPoseResults = this.poseLandmarker.detectForVideo(this.videoEl, timestamp);
      }

      // Update global app state for backward compatibility
      if (window.app) {
        window.app.lastFaceDetections = this.lastFaceResults?.faceLandmarks || [];
      }
    } catch (error) {
      console.error('[Tracking Service] Detection failed:', error);
    }

    this.detectionTimeout = setTimeout(() => this.runDetection(), this.detectionInterval);
  },

  /**
   * Stop the detection loop
   */
  stopDetectionLoop() {
    if (this.detectionTimeout) {
      clearTimeout(this.detectionTimeout);
      this.detectionTimeout = null;
    }
    this.isDetecting = false;
    console.log('[Tracking Service] Stopped detection loop');
  },

  /**
   * Clean up resources
   */
  destroy() {
    this.stopDetectionLoop();

    this.faceLandmarker?.close?.();
    this.handLandmarker?.close?.();
    this.poseLandmarker?.close?.();

    this.faceLandmarker = null;
    this.handLandmarker = null;
    this.poseLandmarker = null;

    this.videoEl = null;
    this.lastFaceResults = null;
    this.lastHandResults = null;
    this.lastPoseResults = null;

    this.isDetecting = false;
    this.isReady = false;

    if (window.app) {
      window.app.lastFaceDetections = [];
    }

    console.log('[Tracking Service] Destroyed');
  },

};

export default trackingService;
