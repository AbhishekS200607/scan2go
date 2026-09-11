/**
 * Scan2Go Camera Barcode & QR Scanner Component
 * Supports EAN-13, EAN-8, UPC-A, Code 128 and QR Codes
 */
class BarcodeScannerEngine {
  constructor({ renderTargetId, onScanSuccess, onError, isQrScanner = false }) {
    this.renderTargetId = renderTargetId;
    this.onScanSuccess = onScanSuccess;
    this.onError = onError;
    this.isQrScanner = isQrScanner;
    this.html5QrcodeScanner = null;
    this.isScanning = false;
    this.lastScannedText = null;
    this.lastScanTime = 0;
    this.currentCameraId = null;
  }

  async getCameras() {
    try {
      if (typeof Html5Qrcode === 'undefined') {
        await this.loadScannerLibrary();
      }
      return await Html5Qrcode.getCameras();
    } catch (e) {
      console.warn('Failed to list camera devices:', e);
      return [];
    }
  }

  async populateCameraSelect(selectElId) {
    const selectEl = document.getElementById(selectElId);
    if (!selectEl) return;

    const cameras = await this.getCameras();
    if (!cameras || cameras.length === 0) {
      selectEl.innerHTML = '<option value="">Default Camera</option>';
      return;
    }

    selectEl.innerHTML = cameras.map((cam, idx) => `
      <option value="${cam.id}">${cam.label || `Camera Device ${idx + 1}`}</option>
    `).join('');

    selectEl.onchange = async (e) => {
      const selectedId = e.target.value;
      if (selectedId) {
        await this.switchCamera(selectedId);
      }
    };
  }

  async switchCamera(cameraId) {
    if (this.isScanning) {
      await this.stopScanner();
    }
    await this.startScanner(cameraId);
  }

  async startScanner(preferredCameraId = null) {
    if (this.isScanning) return;

    try {
      if (typeof Html5Qrcode === 'undefined') {
        await this.loadScannerLibrary();
      }

      // Clear any prior canvas content
      const targetEl = document.getElementById(this.renderTargetId);
      if (targetEl) targetEl.innerHTML = '';

      this.html5QrcodeScanner = new Html5Qrcode(this.renderTargetId, {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxWidth = Math.max(Math.floor(minEdge * 0.8), 120);
          const boxHeight = this.isQrScanner ? boxWidth : Math.max(Math.floor(boxWidth * 0.6), 80);
          return { width: boxWidth, height: boxHeight };
        },
        aspectRatio: 1.0
      };

      const scanCallback = (decodedText, decodedResult) => {
        const now = Date.now();
        // Debounce scan calls to prevent duplicate triggers (2000ms cooldown)
        if (this.lastScannedText === decodedText && (now - this.lastScanTime) < 2000) {
          return;
        }
        this.lastScannedText = decodedText;
        this.lastScanTime = now;

        if (this.onScanSuccess) {
          this.onScanSuccess(decodedText, decodedResult);
        }
      };

      if (preferredCameraId) {
        await this.html5QrcodeScanner.start(
          preferredCameraId,
          config,
          scanCallback,
          () => {}
        );
        this.currentCameraId = preferredCameraId;
      } else {
        // Try camera with facingMode "environment" (rear camera)
        try {
          await this.html5QrcodeScanner.start(
            { facingMode: "environment" },
            config,
            scanCallback,
            () => {} // Silent frame error handler
          );
        } catch (envErr) {
          console.warn('Rear camera unavailable or restricted, attempting desktop camera fallback...', envErr);
          // Fallback to "user" camera or first available desktop webcam
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const cameraId = devices[0].id;
            await this.html5QrcodeScanner.start(
              cameraId,
              config,
              scanCallback,
              () => {}
            );
            this.currentCameraId = cameraId;
          } else {
            throw envErr;
          }
        }
      }

      this.isScanning = true;

      // Mobile Safari / Chrome video element attribute optimization
      if (targetEl) {
        const videoEl = targetEl.querySelector('video');
        if (videoEl) {
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('webkit-playsinline', 'true');
          videoEl.setAttribute('muted', 'true');
          videoEl.muted = true;
        }
      }

      // Automatically register cleanup handlers on window unload/hide
      this._cleanupHandler = () => this.stopScanner();
      window.addEventListener('pagehide', this._cleanupHandler, { once: true });
      window.addEventListener('beforeunload', this._cleanupHandler, { once: true });
    } catch (err) {
      console.warn('Camera scanner start error:', err);
      this.isScanning = false;
      
      const targetEl = document.getElementById(this.renderTargetId);
      if (targetEl) {
        targetEl.innerHTML = `
          <div style="padding:1.5rem;text-align:center;color:rgba(255,255,255,0.85);font-size:0.85rem;">
            <div style="font-size:2rem;margin-bottom:0.4rem;">📷</div>
            <div style="font-weight:700;margin-bottom:0.25rem;color:#ffffff;">Camera Stream Inactive</div>
            <p style="color:rgba(255,255,255,0.65);font-size:0.75rem;margin-bottom:0.5rem;">
              ${err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' 
                ? 'Camera access permission requested. Please allow camera access in your browser settings.' 
                : 'Unable to access live video stream. You can manually enter barcodes below.'}
            </p>
          </div>
        `;
      }
      
      if (this.onError) {
        this.onError(err);
      }
    }
  }

  async stopScanner() {
    if (this._cleanupHandler) {
      window.removeEventListener('pagehide', this._cleanupHandler);
      window.removeEventListener('beforeunload', this._cleanupHandler);
      this._cleanupHandler = null;
    }
    if (this.html5QrcodeScanner && this.isScanning) {
      try {
        await this.html5QrcodeScanner.stop();
        await this.html5QrcodeScanner.clear();
      } catch (e) {
        console.log('Scanner stopped');
      }
      this.isScanning = false;
    }
  }

  loadScannerLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load html5-qrcode library'));
      document.head.appendChild(script);
    });
  }
}
