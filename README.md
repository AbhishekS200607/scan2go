# Scan2Go — Smart Supermarket Self-Checkout & Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.18-blue.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-emerald.svg)](https://supabase.com/)
[![Security](https://img.shields.io/badge/Security-Cryptographic%20QR%20Pass-orange.svg)]()
[![Tests](https://img.shields.io/badge/Tests-24%2F24%20Passing-brightgreen.svg)]()

**Scan2Go** is an enterprise-grade, security-focused smart supermarket self-checkout and management platform built with Node.js, Express, and Supabase PostgreSQL. Customers enter a supermarket, scan product barcodes using their phone/desktop camera, manage their cart in real-time with server-authoritative price enforcement, complete digital payments, and receive a cryptographically secure, single-use exit QR token.

At store exits, security staff scan the QR code to verify purchases atomically before clearance. Administrators access a separate dashboard to track sales, manage inventory, adjust stock with audit trails, handle low-stock alerts, and inspect security verification logs.

---

## 📚 Documentation & System Contracts

- 📖 [REST API Documentation](docs/API.md) — Complete endpoint reference, RBAC roles, request/response contracts, rate limits, and status codes.
- ⚡ [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md) — Step-by-step instructions for hosting Scan2Go on Vercel with Serverless Functions.
- 📋 [Walkthrough & Real-World Compliance Matrix](C:/Users/Lenovo/.gemini/antigravity-ide/brain/75e110c8-f354-4550-b3c5-00c3410b0243/walkthrough.md) — Detailed compliance matrix covering all 65 real-world supermarket conditions.

---

## 🌟 Core Architecture & Security Features

* **Camera Barcode Scanner**: Mobile & desktop browser camera barcode scanning supporting **EAN-13, EAN-8, UPC-A, and Code 128**. Includes sound feedback and manual barcode entry fallback.
* **Server-Authoritative Price Calculation**: Full immunity to client-side price tampering. Server computes live product prices, GST tax (5%), subtotals, and grand totals directly from PostgreSQL `DECIMAL` fields.
* **Historical Bill Snapshots**: `order_items` stores frozen snapshots of unit price, product name, barcode, and tax. Changing a product's price or deactivating a product never alters past customer bills.
* **Cryptographic Exit QR Tokens**: `crypto.randomBytes(32)` tokens stored as SHA-256 hashes (`token_hash`) with a 15-minute expiration window. Zero sensitive card or identity data in payload.
* **Atomic Exit Gate Verification**: PostgreSQL stored procedure (`verify_and_exit_checkout_token`) handles single-use status transitions (`PAID` → `VERIFIED` → `EXITED`) that prevent double-scan replay attacks and guard race conditions.
* **IDOR Protection & RBAC**: Enforces strict server-side authorization (`customer`, `security`, `admin`). Customer A cannot view or manipulate Customer B's order details (`HTTP 403`).
* **Tiered Rate Limiting**: Separate rate limiters for authentication, barcode scanning, QR verification, and general API endpoints.
* **Admin Dashboard & Audit Logs**: Real-time sales analytics, product management, stock adjustment logging (`inventory_movements`), low-stock warnings, and security verification logs (`security_logs`).

---

## 🚀 Quick Start Guide

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(The application features a dual-engine architecture: runs with local pre-seeded database fallback out-of-the-box, or connects to your Supabase PostgreSQL cloud database when configured)*

### 3. Running the Server
Start the Node + Express server:
```bash
npm start
```
Access the application in your browser:
```
http://localhost:5000
```

---

## 🔐 Pre-seeded Demo Accounts

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@scan2go.com` | `customer123` | Barcode Scanner, Cart, Checkout, QR Pass, Order History |
| **Security Staff** | `security@scan2go.com` | `security123` | Exit Gate Scanner, QR Verification, Gate Audit Logs |
| **Administrator** | `admin@scan2go.com` | `admin123` | Dashboard Analytics, Product CRUD, Stock Adjustments, Security Logs |

---

## 🏬 Demo Product Barcodes for Camera Scanning

Try scanning or manually entering these barcodes in the scanner:
* `8901234567890` — Farm Fresh Whole Milk 1L (₹68.00)
* `8901234567894` — Multi-Grain Whole Wheat Bread 400g (₹55.00)
* `8901234567896` — Sparkling Orange Juice 1L (₹145.00)
* `8901234567899` — Crispy Potato Chips 150g (₹60.00)
* `8901234567902` — Organic Basmati Rice 5kg (₹650.00)

---

## 🗄️ Database Setup (Supabase / PostgreSQL)

1. Open your Supabase Project SQL Editor.
2. Run `supabase/migrations/001_initial_schema.sql` to build tables, indexes, constraints, and atomic stored procedures.
3. Run `supabase/seed.sql` to populate initial categories and 20+ demo supermarket products.

---

## 🧪 Automated API Integration Test Suite

Run the 14-phase automated integration test suite (24 assertions covering Auth, Barcode, Cart, Untrusted Price Defense, Stock Race Conditions, Concurrent Gate Scans, IDOR, RBAC, and Historical Snapshots):
```bash
npm test
```

---

## 📄 License
ISC License — Scan2Go Smart Supermarket Project.
