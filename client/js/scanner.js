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
  }

  async startScanner() {
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

      // Try camera with facingMode "environment" (rear camera)
      try {
        await this.html5QrcodeScanner.start(
          { facingMode: "environment" },
          config,
          scanCallback,
          () => {} // Silent frame error handler
        );
      } catch (envErr) {
        console.warn('Rear camera unavailable or restricted, attempting camera fallback...', envErr);
        // Fallback to "user" camera or first available camera device
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const cameraId = devices[0].id;
            await this.html5QrcodeScanner.start(
              cameraId,
              config,
              scanCallback,
              () => {}
            );
          } else {
            throw envErr;
          }
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }

      this.isScanning = true;
    } catch (err) {
      console.warn('Camera scanner start error:', err);
      this.isScanning = false;
      if (this.onError) {
        this.onError(err);
      }
    }
  }

  async stopScanner() {
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
