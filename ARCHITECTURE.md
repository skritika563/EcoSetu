# Eco Setu — System Architecture Document (v2)

> **Source of Truth:** PROJECT_SPEC.md (v2)

---

## 1. High Level Architecture

```mermaid
flowchart TB
    subgraph Client Tier
        HH["Household Web App"]
        ORG["Organization Web App<br/>(School / University / NGO)"]
        COL["Collector Web App"]
        ADM["Admin Web App"]
    end

    subgraph Service Integrations
        FA["Firebase Auth"]
        GM["Google Maps API"]
        RZ["Razorpay Checkout"]
    end

    subgraph Backend Tier (Express.js)
        API["API Gateway / App"]
        MW["Middleware<br/>(Auth & RBAC)"]
        
        subgraph Business Logic Services
            AUTH_S["Auth Service"]
            PICK_S["Pickup Service"]
            PRIC_S["Pricing & Market Engine"]
            ORD_S["Order & Razorpay Service"]
            DRV_S["NGO Drive Service"]
            AI_S["Gemini AI Service"]
        end
    end

    subgraph Cloud Services & Data
        CLD["Cloudinary (Images)"]
        GEM["Google Gemini Vision"]
        MDB[("MongoDB Atlas")]
    end

    Client Tier --> FA
    Client Tier --> GM
    Client Tier --> RZ
    Client Tier --> API

    API --> MW
    MW --> Business Logic Services

    ORD_S <--> RZ
    AI_S <--> GEM
    Business Logic Services <--> CLD
    Business Logic Services <--> MDB
```

---

## 2. Request Flows & Lifecycles

### 2.1 Pickup Request Flow (Offline Payment to User)

```mermaid
sequenceDiagram
    participant User as Household / Org User
    participant App as React App
    participant API as Express API
    participant AI as Gemini Vision API
    participant DB as MongoDB Atlas
    participant Col as Collector

    User->>App: Upload waste image (optional)
    App->>API: POST /api/ai/classify-upload
    API->>AI: Send image buffer
    AI-->>API: Category + Confidence
    API-->>App: Display AI suggestion
    User->>App: Confirm address & date/time
    App->>API: POST /api/pickups
    API->>DB: Save Pickup (Status: pending)
    API-->>App: Pickup scheduled

    Col->>App: View nearby pending pickups
    Col->>App: Accept pickup
    App->>API: PUT /api/pickups/:id/accept
    API->>DB: Status: accepted, assign collectorId

    Col->>User: Arrive at site & verify waste
    Col->>App: Enter verified weights per category
    App->>API: PUT /api/pickups/:id/verify
    API->>DB: Calculate amount via ScrapRates, Status: collected
    Col->>User: Pays cash/UPI offline
    Col->>App: Confirm payment
    App->>API: PUT /api/pickups/:id/status (completed)
    API->>DB: Status: completed
```

### 2.2 Marketplace Buying Flow (Razorpay Integration)

```mermaid
sequenceDiagram
    participant Buyer as Household / Org User
    participant Collector as Scrap Collector
    participant App as React App
    participant API as Express API
    participant RZP as Razorpay Gateway
    participant DB as MongoDB Atlas

    Collector->>App: List scrap material + quantity
    App->>API: POST /api/materials
    API->>DB: Save listing (Calculates price/kg with ScrapRate multiplier)

    Buyer->>App: Browse marketplace & select material
    App->>API: POST /api/orders
    API->>DB: Save Order (Status: pending)

    Collector->>App: Approve purchase request
    App->>API: PUT /api/orders/:id/approve
    API->>DB: Status: approved

    Buyer->>App: Click "Pay Now"
    App->>API: POST /api/orders/:id/create-razorpay-order
    API->>RZP: Create Razorpay Order
    RZP-->>API: Return razorpayOrderId
    API-->>App: Return order credentials
    App->>RZP: Open Razorpay Modal
    Buyer->>RZP: Complete Payment
    RZP-->>App: Payment Response (PaymentId + Signature)
    App->>API: POST /api/orders/verify-razorpay-payment
    API->>API: Verify HMAC Signature
    API->>DB: Status: processing, PaymentStatus: paid, deduct stock
    API-->>App: Payment Verified

    Collector->>Buyer: Ship / Deliver Material
    Collector->>App: Mark Order Delivered
    App->>API: PUT /api/orders/:id/status (delivered)
    API->>DB: Status: completed
```

---

## 3. Module Communication & Roles

```mermaid
graph TD
    subgraph Roles
        H[Household]
        O_EDU[Organization: School/University]
        O_NGO[Organization: NGO]
        C[Collector]
        A[Admin]
    end

    subgraph Features
        P[Pickups]
        M[Marketplace Buying]
        S[Marketplace Selling]
        D[Collection Drives]
        PR[Dynamic Pricing]
    end

    H -->|Schedule & Sell Scrap| P
    O_EDU -->|Schedule & Sell Scrap| P
    O_NGO -->|Schedule & Sell Scrap| P
    
    H -->|Buy Scrap| M
    O_EDU -->|Buy Scrap| M
    O_NGO -->|Buy Scrap| M

    C -->|Fulfill Pickups| P
    C -->|List & Sell Scrap| S
    
    O_NGO -->|Host & Manage| D
    H -->|Participate| D
    O_EDU -->|Participate| D

    A -->|Manage Multipliers & Base Rates| PR
    PR -->|Auto-price| P
    PR -->|Auto-price| S
```
