import trackingService from '../tracking/tracking-service.js';

const trackingMarkersEffect = {
  name: 'tracking-markers',

  // Marker rendering settings
  markerColor: '#00ff00',
  markerSize: 3,
  showFace: true,
  showHands: true,
  showPose: true,
  showConnections: true,
  showMarkers: false,

  init(canvas, analyser) {
    // This effect no longer initializes MediaPipe
    // Tracking is handled by the tracking service
    console.log('[Tracking Markers] Effect initialized (rendering only)');
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

  setShowMarkers(show) {
    this.showMarkers = show;
  },

  /**
   * Get tracking results from the tracking service
   */
  getTrackingResults() {
    return {
      lastFaceResults: trackingService.lastFaceResults,
      lastHandResults: trackingService.lastHandResults,
      lastPoseResults: trackingService.lastPoseResults,
    };
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
    // Only render markers if showMarkers is true
    if (!this.showMarkers) return;

    // Get tracking results from the tracking service
    const { lastFaceResults, lastHandResults, lastPoseResults } = this.getTrackingResults();

    ctx.save();
    ctx.fillStyle = this.markerColor;
    ctx.strokeStyle = this.markerColor;
    ctx.lineWidth = 2;

    if (this.showFace && lastFaceResults?.faceLandmarks) {
      for (const faceLandmarks of lastFaceResults.faceLandmarks) {
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

    if (this.showHands && lastHandResults?.landmarks) {
      for (const handLandmarks of lastHandResults.landmarks) {
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

    if (this.showPose && lastPoseResults?.landmarks) {
      for (const poseLandmarks of lastPoseResults.landmarks) {
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
    // This effect no longer manages tracking lifecycle
    // Tracking service handles cleanup separately
    console.log('[Tracking Markers] Effect destroyed');
  },
};

export default trackingMarkersEffect;