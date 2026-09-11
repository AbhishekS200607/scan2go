# Scan2Go — Self-Checkout REST API Documentation

This document specifies the complete REST API contract for the **Scan2Go — Smart Supermarket Self-Checkout & Management System**.

## 🔐 Authentication & Security

- **Authentication Method**: Bearer JSON Web Token (`Authorization: Bearer <JWT_TOKEN>`)
- **Role Hierarchy**: `customer` | `security` | `admin`
- **Rate Limits**:
  - Auth Endpoints (`/api/auth/login`, `/api/auth/register`): 5 requests / 15 mins
  - Barcode Lookup (`/api/products/barcode/:barcode`): 100 requests / 1 min
  - Security QR Verification (`/api/security/verify`): 20 requests / 1 min
  - General Endpoints (`/api/*`): 100 requests / 15 mins
- **Response Format**: Standard JSON wrapper
  ```json
  // Success Response (HTTP 200/201)
  {
    "success": true,
    "data": { ... },
    "message": "Optional message string"
  }

  // Error Response (HTTP 400/401/403/404/429/500)
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable error message"
    }
  }
  ```

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Create a new customer account.
- **Access**: Public (Rate-limited)
- **Request Body**:
  ```json
  {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123",
    "phone": "+919876543210"
  }
  ```
- **Success Response (HTTP 201)**: Returns user object and JWT token.

### `POST /api/auth/login`
Authenticate user and obtain session JWT token.
- **Access**: Public (Rate-limited)
- **Request Body**:
  ```json
  {
    "email": "customer@scan2go.com",
    "password": "customer123"
  }
  ```
- **Success Response (HTTP 200)**: Returns user profile (`id`, `full_name`, `email`, `role`) and `token`.

### `GET /api/auth/me`
Retrieve authenticated user profile.
- **Access**: Authenticated (`customer`, `security`, `admin`)
- **Success Response (HTTP 200)**: User profile object.

---

## 2. Product & Barcode Endpoints (`/api/products`)

### `GET /api/products/categories`
Get list of active supermarket product categories.
- **Access**: Public

### `GET /api/products/barcode/:barcode`
Look up active product details by barcode (EAN-13, EAN-8, UPC-A, Code 128).
- **Access**: Public (Rate-limited)
- **URL Parameter**: `:barcode` (e.g. `8901234567890`)
- **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "f0000000-0000-0000-0000-000000000001",
      "barcode": "8901234567890",
      "sku": "SKU-MILK-1L",
      "name": "Fresh Organic Milk 1L",
      "description": "Pure pasteurized whole milk from local dairy farms",
      "price": 68.00,
      "tax_percent": 5.00,
      "image_url": "https://images.unsplash.com/...",
      "stock_quantity": 48,
      "minimum_stock": 10,
      "active": true
    }
  }
  ```
- **Error Response (HTTP 404)**: `PRODUCT_NOT_FOUND`

### `GET /api/products`
Query active products with search and category filtering.
- **Query Params**: `category_id`, `search`, `page`, `limit`

---

## 3. Cart Management (`/api/cart`)

All financial totals (Subtotal, GST Tax, Total Amount) are computed server-side. Client-supplied price/tax/subtotal fields are strictly ignored.

### `GET /api/cart`
Retrieve the authenticated customer's current cart state from database.
- **Access**: Authenticated (`customer`)
- **Success Response (HTTP 200)**: Cart payload with items array, subtotals, tax amount, and grand total.

### `POST /api/cart/items`
Add product to cart or increment quantity on scan.
- **Access**: Authenticated (`customer`)
- **Request Body**:
  ```json
  {
    "barcode": "8901234567890",
    "quantity": 1
  }
  ```
- **Validation Rules**:
  - `quantity` must be positive integer (> 0). Negative or zero values return `HTTP 400 INVALID_QUANTITY`.
  - Adding item when `stock_quantity == 0` or exceeding available stock returns `HTTP 400 INSUFFICIENT_STOCK`.

### `PUT /api/cart/items/:id`
Update cart item quantity.
- **Access**: Authenticated (`customer`)

### `DELETE /api/cart/items/:id`
Remove item from cart.
- **Access**: Authenticated (`customer`)

### `DELETE /api/cart`
Clear all items in current cart.
- **Access**: Authenticated (`customer`)

---

## 4. Order Processing (`/api/orders`)

### `POST /api/orders`
Create a new pending checkout order from the current cart.
- **Access**: Authenticated (`customer`)
- **Server Enforcement**:
  - Re-validates stock for every cart item immediately before order creation.
  - Snapshots product name, barcode, unit price, and tax percent into `order_items`.
  - Clears cart upon successful order creation.
- **Success Response (HTTP 201)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "order-uuid",
      "order_number": "SG-123456",
      "status": "PENDING",
      "subtotal": 136.00,
      "tax_amount": 6.80,
      "total_amount": 142.80,
      "items": [ ... ]
    }
  }
  ```

### `GET /api/orders`
Get order history for authenticated customer.
- **Access**: Authenticated (`customer`)

### `GET /api/orders/:id`
Get specific order details.
- **Access**: Authenticated (`customer` - owner only, `security`, `admin`)
- **Security Check**: Returns `HTTP 403 FORBIDDEN` if Customer A requests Customer B's order (IDOR Protection).

---

## 5. Payment Verification (`/api/payments`)

### `POST /api/payments/verify`
Execute payment processing and generate single-use cryptographic QR Exit Pass token.
- **Access**: Authenticated (`customer`)
- **Request Body**:
  ```json
  {
    "order_id": "order-uuid",
    "payment_method": "CARD_SIMULATION"
  }
  ```
- **Workflow**:
  1. Updates order status to `PAYMENT_PROCESSING`.
  2. Executes provider transaction simulation.
  3. Records payment record with provider transaction ID.
  4. Safely deducts inventory stock and logs `inventory_movements`.
  5. Updates order status to `PAID`.
  6. Generates 64-character hex SHA-256 hashed checkout token.
- **Retries & Refresh Safety**: Calling `/payments/verify` on an already `PAID` order retrieves the valid existing QR pass without double-charging or duplicating order records.

---

## 6. Security Gate Verification (`/api/security`)

### `POST /api/security/verify`
Scan and verify QR Exit Pass token at supermarket exit gate.
- **Access**: Authenticated (`security`, `admin`)
- **Request Body**:
  ```json
  {
    "token": "64-character-raw-hex-token-string"
  }
  ```
- **Atomic Database Execution**: Uses PostgreSQL RPC stored procedure `verify_and_exit_checkout_token` to guarantee atomic state transition (`PAID` $\rightarrow$ `EXITED`) and prevent race conditions when two guards scan the same QR simultaneously.
- **Response Codes**:
  - Valid scan: `{ "valid": true, "status": "EXITED", "order_number": "SG-123456", "items": [...] }`
  - Already used: `{ "valid": false, "reason": "QR_ALREADY_USED" }`
  - Expired: `{ "valid": false, "reason": "EXPIRED" }`
  - Unpaid order: `{ "valid": false, "reason": "PAYMENT_NOT_COMPLETED" }`
  - Invalid token: `{ "valid": false, "reason": "INVALID_TOKEN" }`

### `GET /api/security/logs`
Retrieve security verification audit logs.
- **Access**: Authenticated (`security`, `admin`)

---

## 7. Admin & Inventory Management (`/api/admin`)

### `GET /api/admin/dashboard`
Retrieve real-time metrics (Total Revenue, Orders Today, Low Stock Count, Gate Scan Stats).
- **Access**: Authenticated (`admin`)

### `POST /api/admin/inventory/adjust`
Adjust stock quantity for a product with mandatory audit log.
- **Access**: Authenticated (`admin`)
- **Request Body**:
  ```json
  {
    "product_id": "product-uuid",
    "quantity": 50,
    "action": "add",
    "reason": "New delivery shipment"
  }
  ```
