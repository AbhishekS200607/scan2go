/**
 * Scan2Go Camera Barcode & QR Scanner Component
 * Supports EAN-13, EAN-8, UPC-A, Code 128 and QR Codes
 */
class BarcodeScannerEngine {
  constructor({ renderTargetId, onScanSuccess, onError }) {
    this.renderTargetId = renderTargetId;
    this.onScanSuccess = onScanSuccess;
    this.onError = onError;
    this.html5QrcodeScanner = null;
    this.isScanning = false;
  }

  async startScanner() {
    if (this.isScanning) return;

    try {
      if (typeof Html5Qrcode === 'undefined') {
        await this.loadScannerLibrary();
      }

      this.html5QrcodeScanner = new Html5Qrcode(this.renderTargetId);
      const config = {
        fps: 10,
        qrbox: { width: 280, height: 200 },
        aspectRatio: 1.777778
      };

      await this.html5QrcodeScanner.start(
        { facingMode: "environment" }, // Prefer back camera
        config,
        (decodedText, decodedResult) => {
          utils.playBeep();
          if (this.onScanSuccess) {
            this.onScanSuccess(decodedText, decodedResult);
          }
        },
        (errorMessage) => {
          // Silent scan frame miss
        }
      );

      this.isScanning = true;
    } catch (err) {
      console.warn('Camera initialization fallback to simulation/manual mode:', err);
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
