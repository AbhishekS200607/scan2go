/**
 * Scan2Go Security Staff QR Exit Verification Gate Controller
 * Supports Live Camera QR Scanning & Manual QR Token Entry
 */
const securityUI = {
  scannerEngine: null,

  async initSecurityGate() {
    this.loadVerificationHistory();
    this.initQRScanner();
  },

  initQRScanner() {
    const readerEl = document.getElementById('security-reader');
    if (!readerEl) return;

    this.scannerEngine = new BarcodeScannerEngine({
      renderTargetId: 'security-reader',
      onScanSuccess: (qrText) => {
        this.verifyToken(qrText);
      },
      onError: (err) => {
        console.log('Security scanner info:', err);
      }
    });

    this.scannerEngine.startScanner();
  },

  toggleCamera() {
    const btn = document.getElementById('btn-toggle-security-camera');
    if (!this.scannerEngine) return;

    if (this.scannerEngine.isScanning) {
      this.scannerEngine.stopScanner();
      if (btn) btn.textContent = 'Start Camera Scanner';
    } else {
      this.scannerEngine.startScanner();
      if (btn) btn.textContent = 'Stop Camera Scanner';
    }
  },

  async verifyTokenManual() {
    const rawToken = document.getElementById('security-token-input')?.value;
    if (!rawToken) {
      utils.showToast('Please enter or scan a QR checkout token.', 'warning');
      return;
    }
    await this.verifyToken(rawToken.trim());
  },

  async verifyToken(tokenString) {
    if (!tokenString) return;

    try {
      const result = await api.post('/security/verify', { token: tokenString.trim() });
      this.renderVerificationResult(result);
      this.loadVerificationHistory();
    } catch (err) {
      // Handled by API wrapper toast
    }
  },

  renderVerificationResult(res) {
    const container = document.getElementById('security-result-container');
    if (!container) return;

    if (res.valid) {
      utils.playBeep();
      container.innerHTML = `
        <div class="verification-status-card status-valid" style="background:#ecfdf5;border:2px solid var(--accent-green);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1.5rem;text-align:center;">
          <div class="verification-icon icon-valid" style="width:60px;height:60px;background:var(--accent-green);color:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style="color:var(--primary-dark);margin-bottom:0.4rem;font-size:1.6rem;">VERIFIED — EXIT ALLOWED</h2>
          <p class="font-bold" style="font-size:1.1rem;margin-bottom:1rem;color:var(--text-main);">Order #${res.order_number} | Total Paid: ${utils.formatCurrency(res.total)}</p>
          
          <div class="card" style="text-align:left;background:#ffffff;border-color:var(--border-color);margin-top:1rem;">
            <div class="font-bold" style="margin-bottom:0.5rem;border-bottom:1px solid var(--border-color);padding-bottom:0.4rem;color:var(--primary-dark);">Purchased Items Summary (${res.items.length} items)</div>
            ${res.items.map(i => `
              <div style="display:flex;justify-content:space-between;padding:0.35rem 0;font-size:0.9rem;border-bottom:1px dashed #f0f0f0;">
                <div>${i.name} <span class="text-muted" style="font-weight:600;">(x${i.quantity})</span></div>
                <div class="font-bold">${utils.formatCurrency(i.line_total)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="verification-status-card status-invalid" style="background:#fef2f2;border:2px solid var(--danger);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1.5rem;text-align:center;">
          <div class="verification-icon icon-invalid" style="width:60px;height:60px;background:var(--danger);color:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <h2 style="color:var(--danger);margin-bottom:0.4rem;font-size:1.6rem;">VERIFICATION FAILED</h2>
          <p class="font-bold" style="font-size:1.1rem;color:var(--danger);">${res.reason || 'INVALID_OR_EXPIRED_TOKEN'}</p>
          <p style="color:var(--text-muted);margin-top:0.4rem;font-size:0.9rem;">${res.message || 'This QR exit pass is invalid, expired, or has already been used.'}</p>
        </div>
      `;
    }
  },

  async loadVerificationHistory() {
    try {
      const data = await api.get('/security/logs');
      const tableBody = document.getElementById('security-logs-table');
      if (!tableBody) return;

      if (!data.logs || data.logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:1.5rem;">No exit verification scans recorded yet today.</td></tr>`;
        return;
      }

      tableBody.innerHTML = data.logs.map(l => `
        <tr>
          <td><span class="font-bold" style="color:var(--primary-dark);">${l.orders?.order_number || 'N/A'}</span></td>
          <td>
            <span class="badge badge-${l.result === 'VALID' ? 'success' : 'danger'}">
              ${l.result}
            </span>
          </td>
          <td><span class="font-bold" style="font-size:0.85rem;">${l.reason}</span></td>
          <td>${l.profiles?.full_name || 'Security Staff'}</td>
          <td>${utils.formatDate(l.created_at)}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load security logs:', err);
    }
  }
};
