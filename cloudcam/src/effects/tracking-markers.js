import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { HandLandmarker } from '@mediapipe/tasks-vision';
import { PoseLandmarker } from '@mediapipe/tasks-vision';

const trackingMarkersEffect = {
  name: 'tracking-markers',

  faceLandmarker: null,
  handLandmarker: null,
  poseLandmarker: null,

  videoEl: null,
  detectionInterval: 50,
  detectionTimeout: null,

  lastFaceResults: null,
  lastHandResults: null,
  lastPoseResults: null,

  isReady: false,
  isDetecting: false,

  markerColor: '#00ff00',
  markerSize: 3,
  showFace: true,
  showHands: true,
  showPose: true,
  showConnections: true,

  async init(canvas, analyser) {
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
    } catch (error) {
      console.error('Failed to initialize MediaPipe landmarkers:', error);
      this.isReady = false;
    }
  },

  startDetectionLoop(videoEl) {
    if (!this.isReady || this.isDetecting) return;
    this.videoEl = videoEl;
    this.isDetecting = true;
    this.runDetection();
  },

  async runDetection() {
    if (!this.isReady || !this.videoEl) {
      this.isDetecting = false;
      return;
    }

    try {
      const timestamp = performance.now();

      if (this.faceLandmarker && this.showFace) {
        this.lastFaceResults = this.faceLandmarker.detectForVideo(this.videoEl, timestamp);
      }

      if (this.handLandmarker && this.showHands) {
        this.lastHandResults = this.handLandmarker.detectForVideo(this.videoEl, timestamp);
      }

      if (this.poseLandmarker && this.showPose) {
        this.lastPoseResults = this.poseLandmarker.detectForVideo(this.videoEl, timestamp);
      }

      if (window.app) {
        window.app.lastFaceDetections = this.lastFaceResults?.faceLandmarks || [];
      }
    } catch (error) {
      console.error('Tracking detection failed:', error);
    }

    this.detectionTimeout = setTimeout(() => this.runDetection(), this.detectionInterval);
  },

  setMarkerColor(color) {
    this.markerColor = color;
  },

  setMarkerSize(size) {
    this.markerSize = size;
  },

  setShowFace(show) {
    this.showFace = show;
  },

  setShowHands(show) {
    this.showHands = show;
  },

  setShowPose(show) {
    this.showPose = show;
  },

  setShowConnections(show) {
    this.showConnections = show;
  },

  drawLandmark(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, this.markerSize, 0, Math.PI * 2);
    ctx.fill();
  },

  drawConnection(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  },

  render(ctx, videoEl, dt) {
    if (!this.isReady) return;

    if (!this.videoEl) {
      this.startDetectionLoop(videoEl);
    }

    ctx.save();
    ctx.fillStyle = this.markerColor;
    ctx.strokeStyle = this.markerColor;
    ctx.lineWidth = 2;

    if (this.showFace && this.lastFaceResults?.faceLandmarks) {
      for (const faceLandmarks of this.lastFaceResults.faceLandmarks) {
        for (const landmark of faceLandmarks) {
          this.drawLandmark(ctx, landmark.x * 1280, landmark.y * 720);
        }

        if (this.showConnections) {
          const connections = [
            [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
            [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
            [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
            [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
            [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
            [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
          ];

          for (const [i, j] of connections) {
            if (faceLandmarks[i] && faceLandmarks[j]) {
              this.drawConnection(
                ctx,
                { x: faceLandmarks[i].x * 1280, y: faceLandmarks[i].y * 720 },
                { x: faceLandmarks[j].x * 1280, y: faceLandmarks[j].y * 720 }
              );
            }
          }
        }
      }
    }

    if (this.showHands && this.lastHandResults?.landmarks) {
      for (const handLandmarks of this.lastHandResults.landmarks) {
        for (const landmark of handLandmarks) {
          this.drawLandmark(ctx, landmark.x * 1280, landmark.y * 720);
        }

        if (this.showConnections) {
          const handConnections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17],
          ];

          for (const [i, j] of handConnections) {
            if (handLandmarks[i] && handLandmarks[j]) {
              this.drawConnection(
                ctx,
                { x: handLandmarks[i].x * 1280, y: handLandmarks[i].y * 720 },
                { x: handLandmarks[j].x * 1280, y: handLandmarks[j].y * 720 }
              );
            }
          }
        }
      }
    }

    if (this.showPose && this.lastPoseResults?.landmarks) {
      for (const poseLandmarks of this.lastPoseResults.landmarks) {
        for (const landmark of poseLandmarks) {
          this.drawLandmark(ctx, landmark.x * 1280, landmark.y * 720);
        }

        if (this.showConnections) {
          const poseConnections = [
            [11, 12],
            [11, 13], [13, 15],
            [12, 14], [14, 16],
            [11, 23], [12, 24],
            [23, 24],
            [23, 25], [25, 27],
            [24, 26], [26, 28],
          ];

          for (const [i, j] of poseConnections) {
            if (poseLandmarks[i] && poseLandmarks[j]) {
              this.drawConnection(
                ctx,
                { x: poseLandmarks[i].x * 1280, y: poseLandmarks[i].y * 720 },
                { x: poseLandmarks[j].x * 1280, y: poseLandmarks[j].y * 720 }
              );
            }
          }
        }
      }
    }

    ctx.restore();
  },

  destroy() {
    if (this.detectionTimeout) {
      clearTimeout(this.detectionTimeout);
      this.detectionTimeout = null;
    }

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
  },
};

export default trackingMarkersEffect;