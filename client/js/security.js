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

  async initQRScanner() {
    const readerEl = document.getElementById('security-reader');
    if (!readerEl) return;

    this.scannerEngine = new BarcodeScannerEngine({
      renderTargetId: 'security-reader',
      isQrScanner: true,
      onScanSuccess: (qrText) => {
        this.verifyToken(qrText);
      },
      onError: (err) => {
        console.log('Security scanner info:', err);
      }
    });

    await this.scannerEngine.startScanner();
    await this.scannerEngine.populateCameraSelect('security-camera-select');
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
      console.error('Security verification error:', err);
    }
  },

  clearResult() {
    const container = document.getElementById('security-result-container');
    if (container) container.innerHTML = '';
    const input = document.getElementById('security-token-input');
    if (input) input.value = '';
  },

  renderVerificationResult(res) {
    const container = document.getElementById('security-result-container');
    if (!container) return;

    if (res.valid) {
      utils.playBeep();

      // Trigger UI Toast Notification
      utils.showToast(`✅ Exit Verified: Order #${res.order_number || ''}`, 'success');

      // Add to System Notification Drawer
      if (window.notificationsUI) {
        notificationsUI.addNotification({
          title: `🛡️ Exit Pass Verified: Order #${res.order_number || ''}`,
          message: `Cleared for store exit. Total: ${utils.formatCurrency(res.total || 0)} (${(res.items || []).length} items).`,
          type: 'order'
        });
      }

      const totalItemsCount = (res.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
      const grandTotal = res.total || 0;
      const subtotalNet = grandTotal / 1.05;
      const gstAmount = grandTotal - subtotalNet;
      const staffName = document.getElementById('security-user-name')?.textContent || 'Security Staff Gate #1';

      container.innerHTML = `
        <div class="verification-status-card status-valid print-section" style="background:#ffffff;border:2px solid var(--accent-green);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1.5rem;box-shadow:var(--shadow-lg);">
          
          <!-- Scan Success Banner -->
          <div class="no-print" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:var(--radius-md);padding:0.9rem 1.1rem;margin-bottom:1.25rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <div style="width:40px;height:40px;background:var(--accent-green);color:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style="font-size:1.1rem;font-weight:800;color:#065f46;">VERIFICATION SUCCESSFUL</div>
                <div style="font-size:0.82rem;color:#047857;">Customer payment verified — cleared to exit gate.</div>
              </div>
            </div>
            <span class="badge badge-success" style="font-size:0.82rem;padding:0.35rem 0.8rem;letter-spacing:0.05em;">EXIT STAMPED</span>
          </div>

          <!-- Official Itemized Verification Invoice -->
          <div class="invoice-box" style="border:1px solid #e2e8f0;border-radius:var(--radius-md);padding:1.25rem;background:#fafbfc;">
            
            <!-- Store Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e2e8f0;padding-bottom:0.85rem;margin-bottom:1rem;">
              <div>
                <div style="font-size:1.2rem;font-weight:900;color:var(--primary-dark);letter-spacing:0.04em;">SCAN<span style="color:var(--accent-green);">2</span>GO SUPERMARKET</div>
                <div style="font-size:0.78rem;color:var(--text-muted);font-weight:600;">Store Exit Verification Tax Invoice</div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.15rem;">GSTIN: 27AAACS2006G1Z9 | Self-Checkout Station</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:1.05rem;font-weight:800;color:var(--primary-dark);font-family:monospace;">#${res.order_number || 'SG-PASSED'}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${utils.formatDate(res.verified_at || new Date().toISOString())}</div>
              </div>
            </div>

            <!-- Verification Metadata Summary Grid -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:0.6rem;background:#ffffff;padding:0.75rem;border-radius:8px;border:1px solid #edf2f7;margin-bottom:1rem;font-size:0.8rem;">
              <div>
                <span style="color:var(--text-muted);display:block;font-size:0.7rem;text-transform:uppercase;">Gate Result</span>
                <strong style="color:var(--accent-green);">PASSED & EXITED</strong>
              </div>
              <div>
                <span style="color:var(--text-muted);display:block;font-size:0.7rem;text-transform:uppercase;">Verified By</span>
                <strong>${staffName}</strong>
              </div>
              <div>
                <span style="color:var(--text-muted);display:block;font-size:0.7rem;text-transform:uppercase;">Total Items</span>
                <strong>${totalItemsCount} Units (${(res.items || []).length} Lines)</strong>
              </div>
              <div>
                <span style="color:var(--text-muted);display:block;font-size:0.7rem;text-transform:uppercase;">Payment Status</span>
                <strong style="color:var(--accent-green);">PAID IN FULL</strong>
              </div>
            </div>

            <!-- Itemized Product Table -->
            <div style="margin-bottom:1rem;">
              <div style="font-size:0.85rem;font-weight:800;color:var(--primary-dark);margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
                <span>Verified Product Items List</span>
                <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted);">${(res.items || []).length} Products</span>
              </div>

              <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.82rem;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
                  <thead>
                    <tr style="background:#f1f5f9;color:var(--primary-dark);text-align:left;border-bottom:1px solid #cbd5e1;">
                      <th style="padding:0.5rem 0.65rem;width:30px;">#</th>
                      <th style="padding:0.5rem 0.65rem;">Product & Barcode</th>
                      <th style="padding:0.5rem 0.65rem;text-align:center;width:50px;">Qty</th>
                      <th style="padding:0.5rem 0.65rem;text-align:right;width:85px;">Price</th>
                      <th style="padding:0.5rem 0.65rem;text-align:right;width:90px;">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(res.items || []).map((item, idx) => {
                      const qty = item.quantity || 1;
                      const lineTot = item.line_total || 0;
                      const unitP = item.unit_price || (lineTot / qty);
                      return `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                          <td style="padding:0.5rem 0.65rem;color:var(--text-muted);">${idx + 1}</td>
                          <td style="padding:0.5rem 0.65rem;">
                            <div style="font-weight:700;color:var(--primary-dark);">${item.name || item.product_name_snapshot}</div>
                            <div style="font-family:monospace;font-size:0.7rem;color:var(--text-muted);">${item.barcode || item.barcode_snapshot || 'N/A'}</div>
                          </td>
                          <td style="padding:0.5rem 0.65rem;text-align:center;font-weight:700;background:#f8fafc;">${qty}</td>
                          <td style="padding:0.5rem 0.65rem;text-align:right;">${utils.formatCurrency(unitP)}</td>
                          <td style="padding:0.5rem 0.65rem;text-align:right;font-weight:800;color:var(--primary-dark);">${utils.formatCurrency(lineTot)}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Financial Totals Box -->
            <div style="background:#ffffff;padding:0.85rem;border-radius:8px;border:1px solid #e2e8f0;max-width:300px;margin-left:auto;font-size:0.82rem;">
              <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;color:var(--text-muted);">
                <span>Net Subtotal:</span>
                <span>${utils.formatCurrency(subtotalNet)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:0.35rem;color:var(--text-muted);">
                <span>GST (5% Included):</span>
                <span>${utils.formatCurrency(gstAmount)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding-top:0.4rem;border-top:2px solid #e2e8f0;font-size:1.05rem;font-weight:900;color:var(--primary-dark);">
                <span>Grand Total Paid:</span>
                <span style="color:var(--accent-green);">${utils.formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div style="margin-top:1rem;text-align:center;font-size:0.72rem;color:var(--text-muted);border-top:1px dashed #cbd5e1;padding-top:0.6rem;">
              Verified by Scan2Go Security Gate Protocol • Single-Use Exit Pass Cleared
            </div>
          </div>

          <!-- Action Toolbar Buttons -->
          <div class="no-print" style="display:flex;gap:0.75rem;justify-content:center;margin-top:1.25rem;flex-wrap:wrap;">
            <button onclick="window.print()" class="btn btn-secondary btn-sm" style="display:flex;align-items:center;gap:6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print / Save Verification Invoice PDF
            </button>
            <button onclick="securityUI.clearResult()" class="btn btn-outline btn-sm" style="display:flex;align-items:center;gap:6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Clear View for Next Customer
            </button>
          </div>
        </div>
      `;
    } else {
      // Trigger UI Toast Notification for Failed Scan
      utils.showToast(`🚨 Exit Failed: ${res.reason || 'Invalid Pass'}`, 'error');

      // Add to System Notification Drawer
      if (window.notificationsUI) {
        notificationsUI.addNotification({
          title: `🚨 Security Gate Alert: Exit Verification Failed`,
          message: `Reason: ${res.reason || 'INVALID_OR_EXPIRED'}. ${res.message || 'Pass invalid or already used.'}`,
          type: 'system'
        });
      }

      container.innerHTML = `
        <div class="verification-status-card status-invalid print-section" style="background:#ffffff;border:2px solid var(--danger);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1.5rem;box-shadow:var(--shadow-lg);">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-md);padding:1.25rem;text-align:center;margin-bottom:1rem;">
            <div style="width:52px;height:52px;background:var(--danger);color:#ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
            <h2 style="color:var(--danger);margin-bottom:0.3rem;font-size:1.5rem;">VERIFICATION FAILED — DO NOT EXIT</h2>
            <div style="display:inline-block;background:#fee2e2;color:#991b1b;font-weight:800;font-size:0.85rem;padding:0.25rem 0.85rem;border-radius:20px;margin-bottom:0.5rem;font-family:monospace;">
              REASON: ${res.reason || 'INVALID_OR_EXPIRED_TOKEN'}
            </div>
            <p style="color:#7f1d1d;font-size:0.88rem;margin:0;line-height:1.4;">${res.message || 'This QR exit pass is invalid, expired, or has already been verified.'}</p>
          </div>

          <div class="no-print" style="text-align:center;">
            <button onclick="securityUI.clearResult()" class="btn btn-secondary btn-sm">Clear & Scan Next Pass</button>
          </div>
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
