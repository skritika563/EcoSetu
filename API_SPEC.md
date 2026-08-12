# Eco Setu — REST API Specification (v2)

> **Protocol:** HTTPS REST API  
> **Format:** JSON  
> **Auth:** Bearer Firebase ID Token  
> **Source of Truth:** PROJECT_SPEC.md (v2 — restructured roles, buy/sell marketplace, Razorpay & Drives)

---

## 1. Global API Standards

### Base URL
`http://localhost:5000/api`

### Authentication Header
```http
Authorization: Bearer <firebase_id_token>
```

### Standard Response Formats

#### Success (2xx)
```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

#### Error (4xx / 5xx)
```json
{
  "success": false,
  "message": "Human readable error description",
  "error": {
    "code": "ERROR_CODE_STRING",
    "details": []
  }
}
```

### Global HTTP Error Codes
- `400 Bad Request` — Validation failed, missing parameters
- `401 Unauthorized` — Missing or invalid Firebase ID token
- `403 Forbidden` — Insufficient role permissions
- `404 Not Found` — Requested resource does not exist
- `409 Conflict` — Resource already exists (e.g. email duplicate)
- `500 Internal Server Error` — Server/Database exception

---

## 2. API Modules Summary

| Module | Base Path | Endpoints | Key Operations |
|---|---|---|---|
| **Auth** | `/api/auth` | 4 | Register, login sync, me, logout |
| **Users** | `/api/users` | 3 | Public profile, update profile, image upload |
| **Pickups** | `/api/pickups` | 9 | Create, list, accept, status flow, verify waste, cancel, nearby |
| **AI** | `/api/ai` | 2 | Classify by URL, classify by file upload |
| **Scrap Rates** | `/api/scrap-rates` | 4 | List rates, rate detail, update base rates/multipliers (admin) |
| **Organizations**| `/api/organizations` | 4 | Register org, list, detail, update |
| **Materials** | `/api/materials` | 5 | List scrap for sale (collector only), browse, detail, update, delist |
| **Orders** | `/api/orders` | 7 | Create order, list, detail, approve, Razorpay init, Razorpay webhook/verify, cancel |
| **Drives** | `/api/drives` | 6 | Create (NGO only), list active/past, detail, update, participate, cancel |
| **Notifications**| `/api/notifications` | 5 | List feed, unread count, mark read, mark all read, delete |
| **Reviews** | `/api/reviews` | 3 | Create review, list by user, list by pickup/order |
| **Analytics** | `/api/analytics` | 3 | Platform overview, user impact stats, trend analysis |
| **Admin** | `/api/admin` | 6 | User management, collector verification, suspension, disputes overview |

**Total Endpoints:** 61

---

## 3. Detailed API Contracts

### 3.1 Auth Module (`/api/auth`)

#### `POST /api/auth/register`
- **Auth Required:** Yes (Firebase Auth token)
- **Role:** Any (`household`, `organization`, `collector`, `admin`)
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "role": "organization",
    "organizationType": "university",
    "phone": "9876543210",
    "address": {
      "street": "123 Campus Road",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "coordinates": { "lat": 19.076, "lng": 72.8777 }
    }
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "_id": "66a0123456789abcdef00001",
      "firebaseUid": "FIREBASE_UID_123",
      "name": "Jane Doe",
      "email": "jane@university.edu",
      "role": "organization",
      "organizationType": "university",
      "isVerified": false
    }
  }
  ```

#### `POST /api/auth/login`
- **Auth Required:** Yes
- **Role:** Any
- **Response (200):** Returns existing user record & syncs Firebase session.

#### `GET /api/auth/me`
- **Auth Required:** Yes
- **Role:** Any
- **Response (200):** Current logged-in user profile object.

#### `POST /api/auth/logout`
- **Auth Required:** Yes
- **Role:** Any
- **Response (200):** Clears cookie/session headers.

---

### 3.2 Users Module (`/api/users`)

#### `GET /api/users/:id`
- **Auth Required:** Yes
- **Role:** Any
- **Response (200):** Public profile of target user.

#### `PUT /api/users/profile`
- **Auth Required:** Yes
- **Role:** Any
- **Request Body:** Update fields (`name`, `phone`, `address`).

#### `POST /api/users/upload-avatar`
- **Auth Required:** Yes
- **Role:** Any
- **Payload:** `multipart/form-data` with `file`. Streamed to Cloudinary.

---

### 3.3 Pickups Module (`/api/pickups`)

#### `POST /api/pickups`
- **Auth Required:** Yes
- **Role:** `household`, `organization`
- **Request Body:**
  ```json
  {
    "pickupType": "scheduled",
    "estimatedCategory": "plastic",
    "estimatedWeight": 12.5,
    "imageUrls": ["https://res.cloudinary.com/.../waste1.jpg"],
    "userSelectedCategory": "plastic",
    "pickupAddress": {
      "street": "Green Enclave 402",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "coordinates": { "lat": 19.076, "lng": 72.8777 }
    },
    "pickupDate": "2026-08-05T00:00:00.000Z",
    "pickupTimeSlot": "9AM-12PM",
    "isDonation": false,
    "notes": "Gate #2 behind library"
  }
  ```

#### `GET /api/pickups`
- **Auth Required:** Yes
- **Role:** Any (filtered by user/collector context)

#### `GET /api/pickups/nearby`
- **Auth Required:** Yes
- **Role:** `collector`
- **Params:** `lat`, `lng`, `radius` (km)

#### `PUT /api/pickups/:id/accept`
- **Auth Required:** Yes
- **Role:** `collector`

#### `PUT /api/pickups/:id/status`
- **Auth Required:** Yes
- **Role:** `collector`
- **Request Body:** `{ "status": "on_the_way" }`

#### `PUT /api/pickups/:id/verify`
- **Auth Required:** Yes
- **Role:** `collector`
- **Request Body:**
  ```json
  {
    "verifiedCategories": [
      { "category": "plastic", "weight": 14.0 },
      { "category": "cardboard", "weight": 5.2 }
    ]
  }
  ```
- **Side Effect:** Automatically fetches current base rates from `ScrapRates`, calculates amounts, updates `totalAmount`, and marks status `collected`.

#### `PUT /api/pickups/:id/cancel`
- **Auth Required:** Yes
- **Role:** `household`, `organization`, `collector`, `admin`

---

### 3.4 Materials Module (`/api/materials`) — Collector Seller View & Public Marketplace

#### `POST /api/materials`
- **Auth Required:** Yes
- **Role:** `collector` (Only collectors can sell scrap)
- **Request Body:**
  ```json
  {
    "category": "plastic",
    "quantity": 150.0,
    "condition": "good",
    "source": "Sorted PET bottles from weekly collection",
    "imageUrls": ["https://res.cloudinary.com/.../pet_bales.jpg"]
  }
  ```
- **Side Effect:** System looks up `ScrapRates` for `plastic` (e.g. base ₹18 * multiplier 1.5 = ₹27/kg) and calculates `sellingPricePerKg` automatically.

#### `GET /api/materials`
- **Auth Required:** No (Public browsing)
- **Params:** `category`, `city`, `minQty`, `maxPrice`, `page`, `limit`

#### `GET /api/materials/:id`
- **Auth Required:** No
- **Response:** Material details including seller information and calculated selling price.

#### `PUT /api/materials/:id`
- **Auth Required:** Yes
- **Role:** `collector` (Owner only)

#### `DELETE /api/materials/:id`
- **Auth Required:** Yes
- **Role:** `collector` (Owner only) — Delists material.

---

### 3.5 Orders Module (`/api/orders`) — Marketplace Buying & Razorpay Integration

#### `POST /api/orders`
- **Auth Required:** Yes
- **Role:** `household`, `organization` (Both can buy from marketplace)
- **Request Body:**
  ```json
  {
    "materialId": "66a099887766554433221100",
    "quantityOrdered": 30.0,
    "purpose": "Upcycling workshop and campus research",
    "deliveryAddress": {
      "street": "Department of Civil Engineering",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400076",
      "coordinates": { "lat": 19.1334, "lng": 72.9133 }
    }
  }
  ```
- **Response (201):** Order created with status `pending`, price snapshot, and quantity discount factor calculated.

#### `PUT /api/orders/:id/approve`
- **Auth Required:** Yes
- **Role:** `collector` (Seller)
- **Response:** Order status updated to `approved`. Buyer can now proceed to payment.

#### `POST /api/orders/:id/create-razorpay-order`
- **Auth Required:** Yes
- **Role:** `household`, `organization` (Buyer)
- **Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "orderId": "66b1122334455",
      "razorpayOrderId": "order_N1234567890",
      "amount": 76950, 
      "currency": "INR",
      "keyId": "rzp_test_123456"
    }
  }
  ```

#### `POST /api/orders/verify-razorpay-payment`
- **Auth Required:** Yes
- **Role:** `household`, `organization` (Buyer)
- **Request Body:**
  ```json
  {
    "orderId": "66b1122334455",
    "razorpayOrderId": "order_N1234567890",
    "razorpayPaymentId": "pay_P9876543210",
    "razorpaySignature": "45f6a7b8c9..."
  }
  ```
- **Side Effect:** Verifies HMAC signature. If valid, marks order `paymentStatus: "paid"`, `status: "processing"`, deducts quantity from `materials.quantityAvailable`, and alerts seller.

#### `GET /api/orders`
- **Auth Required:** Yes
- **Role:** Any (filtered to user's orders as buyer or seller)

#### `GET /api/orders/:id`
- **Auth Required:** Yes
- **Role:** Buyer, Seller, or Admin

#### `PUT /api/orders/:id/cancel`
- **Auth Required:** Yes
- **Role:** Buyer, Seller, or Admin

---

### 3.6 Drives Module (`/api/drives`) — NGO Collection Drives

#### `POST /api/drives`
- **Auth Required:** Yes
- **Role:** `organization` (Must have `organizationType == 'ngo'`)
- **Request Body:**
  ```json
  {
    "title": "Clean Coastal Plastic Drive 2026",
    "description": "Mass beach cleanup & plastic aggregation drive",
    "targetWeightKg": 1000,
    "categories": ["plastic", "mixed_waste"],
    "location": {
      "address": "Juhu Beach North Gate",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400049",
      "coordinates": { "lat": 19.1075, "lng": 72.8263 }
    },
    "startDate": "2026-08-15T09:00:00.000Z",
    "endDate": "2026-08-15T18:00:00.000Z",
    "imageUrl": "https://res.cloudinary.com/.../drive_banner.jpg"
  }
  ```

#### `GET /api/drives`
- **Auth Required:** No (Public browsing of community drives)
- **Params:** `status`, `city`, `organizationId`

#### `GET /api/drives/:id`
- **Auth Required:** No

#### `PUT /api/drives/:id`
- **Auth Required:** Yes
- **Role:** Creator NGO only

#### `POST /api/drives/:id/participate`
- **Auth Required:** Yes
- **Role:** `household`, `organization` (Join community drive)

#### `PUT /api/drives/:id/cancel`
- **Auth Required:** Yes
- **Role:** Creator NGO or Admin

---

### 3.7 Scrap Rates Module (`/api/scrap-rates`)

#### `GET /api/scrap-rates`
- **Auth Required:** No
- **Response:** List of all waste categories, current base rates (₹/kg), and marketplace multipliers.

#### `GET /api/scrap-rates/:id`
- **Auth Required:** No

#### `PUT /api/scrap-rates/:id`
- **Auth Required:** Yes
- **Role:** `admin`
- **Request Body:**
  ```json
  {
    "pricePerKg": 20.0,
    "marketMultiplier": 1.6
  }
  ```

---

### 3.8 Organizations, Notifications, Reviews, Analytics, Admin Modules

- **`/api/organizations`**: CRUD for Organization Profiles.
- **`/api/notifications`**: List, mark read, unread count.
- **`/api/reviews`**: Post rating/comment after pickup or order.
- **`/api/analytics`**: Dashboard impact metrics (CO2 saved, trees equivalent).
- **`/api/admin`**: Collector verification toggle, user suspension, global overview.

---

## 4. Error Code Dictionary

| Code | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing/expired Bearer token |
| `FORBIDDEN_ROLE` | 403 | User role not permitted for this action |
| `INVALID_ORG_TYPE` | 403 | Action restricted to specific org subtype (e.g. NGO for drives) |
| `NOT_FOUND` | 404 | Target resource missing |
| `INVALID_PAYMENT_SIGNATURE` | 400 | Razorpay signature verification failed |
| `INSUFFICIENT_STOCK` | 400 | Quantity ordered exceeds available scrap listing |
| `CANNOT_BUY_OWN_MATERIAL` | 400 | Collector attempting to purchase their own listing |
