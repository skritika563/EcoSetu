# PROJECT MASTER SPECIFICATION

## PROJECT TITLE

**Working Title:** EcoSetu
**Tagline:** Bringing Waste to Worth

---

## PROJECT OVERVIEW

Eco Setu is an AI-powered Circular Economy Platform that connects households, organizations (NGOs, schools, universities), scrap collectors, and administrators. The platform enables waste collection, AI-assisted waste classification, pickup scheduling, tracking, redistribution of recyclable materials, and a buy/sell marketplace for scrap.

This should look and feel like a modern startup product, NOT a college project.

**Examples of UI quality:**
- Linear
- Notion
- Stripe
- Airbnb
- Google Classroom
- Uber Dashboard

The design should be modern, premium, clean, sustainable, responsive, and scalable.

---

## PROBLEM STATEMENT

Currently:
- Households often do not know how to dispose of recyclable waste.
- Scrap collectors operate in an unorganized manner.
- NGOs and universities struggle to source recyclable materials.
- There is no centralized marketplace for buying/selling recyclable scrap.
- Many recyclable materials end up in landfills.
- There is no centralized digital platform connecting all stakeholders.

---

## PROPOSED SOLUTION

Build a platform that:
1. Allows households and organizations to schedule waste pickup.
2. Allows users to upload waste images.
3. Uses AI to identify waste type. Manual classification by user is also allowed.
4. Enables pickup scheduling — (instant: charged, scheduled: free of cost).
5. Connects waste collectors with households and organizations.
6. Provides a buy/sell marketplace where collectors sell scrap and anyone can buy.
7. Uses dynamic algorithmic pricing for marketplace based on market rates.
8. Integrates Razorpay for marketplace payments.
9. Tracks waste through the recycling lifecycle.
10. Provides sustainability impact metrics.
11. Allows users to either sell or donate scrap to collectors.
12. Allows NGOs to create collection drives.

---

## SDG ALIGNMENT

The platform contributes to:
- **SDG 8:** Decent Work and Economic Growth
- **SDG 9:** Industry, Innovation and Infrastructure
- **SDG 11:** Sustainable Cities and Communities
- **SDG 12:** Responsible Consumption and Production
- **SDG 13:** Climate Action
- **SDG 17:** Partnerships for the Goals

---

## TARGET USERS

### Household Users
Can:
- Register and login
- Sell or donate scrap to collectors (via pickup system)
- Upload waste images
- Schedule pickups (instant or scheduled)
- Track pickup status
- View recycling impact
- Browse and buy from marketplace (Razorpay payment)

### Organizations (NGO / School / University)

All organization subtypes share these capabilities:
- Register and login
- Sell or donate scrap to collectors (via pickup system)
- Upload waste images
- Schedule pickups
- Track pickup status
- View recycling impact
- Register organization profile
- Browse and buy from marketplace (Razorpay payment)
- Manage requests/orders

**NGOs additionally can:**
- Create and manage collection drives
- Set drive goals, locations, dates
- Track drive participation and impact

**Dashboard split:**
- School and University share one Organization Dashboard
- NGO has its own dashboard with the extra "Drives" section

### Scrap Collectors
Can:
- Register and login
- View nearby pickup requests
- Accept pickup requests
- Navigate to pickup location
- Verify waste at collection site
- Classify waste using AI or manual selection
- Enter actual weight for each waste category
- View automatically calculated payment
- Confirm payment made to the household/organization
- Update pickup status
- View completed pickups
- Track earnings
- **List scrap materials on marketplace for sale**
- **Set availability and manage listings**
- **Receive marketplace orders and fulfill them**
- **Receive Razorpay payments from buyers**

### Administrators
Can:
- Manage users
- Verify collectors
- Monitor platform activity
- View analytics
- Resolve disputes
- Manage scrap rates and marketplace multipliers
- View marketplace transactions

---

## USER ROLES

| Role | SubType | Description |
|---|---|---|
| `household` | — | Individual residential users |
| `organization` | `ngo` | Non-governmental organizations (can create drives) |
| `organization` | `school` | Educational institutions (K-12) |
| `organization` | `university` | Higher education institutions |
| `collector` | — | Verified scrap collectors |
| `admin` | — | Platform administrators |

---

## TECHNOLOGY STACK

### Frontend
- React
- React Router
- Tailwind CSS
- Framer Motion
- Axios
- React Icons

### Mobile Application
- React Native
- Expo
- **Note:** The mobile application will be developed after the web platform is completed.

### Backend
- Node.js
- Express.js

### Additional Backend Packages
- Mongoose (MongoDB ODM)
- Firebase Admin SDK
- Multer
- Cloudinary SDK
- Razorpay SDK
- dotenv
- CORS
- Helmet
- Morgan
- Cookie Parser
- Express Validator
- Nodemon (Development)

### Database
- MongoDB Atlas

### Authentication
- Firebase Authentication
- Firebase Admin SDK (Backend Verification)

### Image Storage
- Cloudinary
- **Purpose:**
  - Store uploaded waste images
  - Store only image URLs in MongoDB
  - Optimize image delivery

### Artificial Intelligence
- Google Gemini Vision API
- **Purpose:**
  - Waste Classification
  - Material Identification
  - Recyclability Detection
  - Confidence Score Generation
  - Basic Waste Description

### Maps
- Google Maps API
- **Purpose:**
  - Pickup Address Selection
  - Collector Location Visualization
  - Drive Location Selection
  - Route Planning (Future Enhancement)

### Payments
- Razorpay
- **Purpose:**
  - Marketplace payments (organization/household buys from collector)
  - Order payment processing
  - Refund handling
- **Note:** Pickup payments (collector pays household) remain offline (cash/UPI)

---

## SYSTEM ARCHITECTURE

```
User (Household / Organization / Collector)
  │
  ▼
React Frontend
  │
  ├── Firebase Auth (Client SDK)
  ├── Google Maps API
  ├── Razorpay Checkout
  │
  ▼ Axios API Calls
  │
Node.js + Express Backend
  │
  ├── Firebase Admin SDK (Token Verification)
  ├── Cloudinary (Image Upload/Delivery)
  ├── Google Gemini Vision (AI Classification)
  ├── Razorpay SDK (Payment Verification)
  │
  ▼
MongoDB Atlas
```

---

## CORE FEATURES

### User Authentication
- Signup with role selection (household / organization + subtype / collector)
- Login
- Logout
- Role-based access
- Protected routes

### AI Waste Classification

The platform provides optional AI-assisted waste classification.

The user may classify waste using either:
- AI Image Classification
- Manual Category Selection

Waste category selection is optional and is intended only to provide an estimate for the collector before pickup. The user is not responsible for providing the final waste classification.

**Supported Categories:**
- Plastic
- Glass
- Paper
- Cardboard
- Metal
- E-Waste
- Mixed Waste
- Organic (Future)
- Textile (Future)

**Gemini Vision will return:**
- Estimated Material Type
- Recyclability
- Confidence Score

Users may accept the AI suggestion or manually change the category before submitting the pickup request.

### Pickup Scheduling

Users (household and organization) can:
- Upload one or more waste images (optional)
- Select waste category manually (optional)
- Use AI waste classification (optional)
- Enter an estimated total weight (optional)
- Select pickup address
- Choose pickup date
- Choose pickup time
- Add notes
- Submit pickup request

Users are not required to provide exact categories or accurate weights. Final verification is performed by the collector during pickup.

**Pickup types:**
- **Scheduled Pickup** (Free)
- **Instant Pickup** (Additional Service Charge)

### Pickup Tracking

**Status Flow:**
```
Pending → Accepted → Collector Assigned → On The Way → Collected → Delivered → Completed
```

Users can monitor status in real time.

### Collector Management

Collectors can:
- View nearby pickup requests
- Accept pickup requests
- Navigate to pickup location
- Verify waste at collection site
- Classify waste using AI Image Classification or Manual Selection
- Enter actual weight for each waste category
- View automatically calculated payment
- Confirm payment made to the household/organization
- Update pickup status
- View completed pickups
- Track earnings

### Smart Pricing Engine (Pickup)

**Workflow:**
```
Collector arrives → Classifies waste → Enters weight per category
    → System retrieves current scrap rates → Price calculated automatically
    → Collector pays user → Transaction stored
```

**Example:**

| Category | Weight | Rate/kg | Amount |
|---|---|---|---|
| Plastic | 4 kg | ₹18 | ₹72 |
| Cardboard | 8 kg | ₹10 | ₹80 |
| Glass | 5 kg | ₹4 | ₹20 |
| **Total** | | | **₹172** |

The pricing algorithm should be modular so that category rates can be updated by administrators without changing application logic.

**Payment:** Offline (cash/UPI between collector and household/organization)

### Buy/Sell Marketplace

**Who can sell:** Only scrap collectors
**Who can buy:** Households, organizations (NGO, school, university)

**Marketplace Flow:**
```
Collector lists material with quantity
    ↓
Algorithm calculates selling price:
    sellingPrice = baseRate × marketMultiplier × quantityFactor
    ↓
Buyers browse marketplace with prices displayed
    ↓
Buyer places order (purchase request)
    ↓
Buyer pays via Razorpay
    ↓
Collector approves and fulfills order
    ↓
Material delivered → Order completed
```

**Dynamic Pricing Algorithm:**

```
sellingPrice = baseRate × marketMultiplier × quantityFactor

Where:
  baseRate         = ScrapRates.pricePerKg (admin-set base rate)
  marketMultiplier = 1.3 – 2.0 (admin-configurable per category)
  quantityFactor   = discount tiers for bulk purchases:
                      1-10 kg   → 1.0  (no discount)
                      11-50 kg  → 0.95 (5% discount)
                      51+ kg    → 0.90 (10% discount)
```

**Example:**

| Category | Base Rate | Multiplier | Qty | Factor | Sell Price/kg | Total |
|---|---|---|---|---|---|---|
| Plastic | ₹18 | 1.5× | 25 kg | 0.95 | ₹25.65 | ₹641.25 |
| Metal | ₹35 | 1.4× | 5 kg | 1.0 | ₹49.00 | ₹245.00 |

**Payment:** Razorpay (online payment gateway)

### NGO Collection Drives

NGOs can create collection drives:
- Set drive name, description, goal (target kg)
- Set drive location (Google Maps)
- Set drive dates (start/end)
- Publish drive for community participation
- Track participation and collected weight
- View drive impact metrics

Drives appear on the platform for households and other organizations to participate in.

### Sustainability Dashboard

Display:
- Total Waste Recycled
- Pickups Completed
- Carbon Emissions Saved
- Trees Equivalent Saved
- Community Impact
- Marketplace Transactions

### Notification System

Notifications for:
- Pickup accepted
- Collector assigned
- Status updates
- Marketplace orders (new, approved, shipped, delivered)
- Payment confirmations
- Drive announcements (NGO drives)
- Material requests

---

## DATABASE REQUIREMENTS

Design complete MongoDB schema. Collections expected:
- Users
- Pickups
- Organizations
- ScrapRates
- Materials
- Orders (marketplace)
- Notifications
- Reviews
- Drives
- Analytics

Design relationships and indexing strategy.

---

## FIREBASE AUTH

Use Firebase Authentication ONLY.

**Authentication flow:**
```
Frontend: Firebase Login
    ↓
Firebase ID Token
    ↓
Send token to backend
    ↓
Backend verifies token using Firebase Admin SDK
    ↓
Backend creates/retrieves MongoDB user
    ↓
Backend returns user profile
```

Create middleware: `verifyFirebaseToken()`
All protected APIs should use this middleware.

---

## CLOUDINARY INTEGRATION

**Flow:**
```
Upload image → Cloudinary → Get image URL → Save URL in MongoDB
```

Never store image files in MongoDB. Only URLs.

---

## GEMINI VISION INTEGRATION

### Household / Organization
The AI assists users by estimating the waste category from uploaded images. Users may:
- Accept AI prediction
- Edit category manually
- Skip AI classification completely

### Collector
Collectors may also use AI to assist in classifying collected waste before entering final weights. Collectors always have the ability to manually override AI predictions.

The AI serves as a recommendation tool and does not make the final classification decision.

**Gemini returns:**
- Estimated Material Type
- Recyclability
- Confidence Score

**Store:**
- AI prediction
- User-selected category (if applicable)
- Collector-verified category
- Confidence score

---

## RAZORPAY INTEGRATION

**Used for:** Marketplace payments only (not pickup payments)

**Flow:**
```
Buyer places marketplace order
    ↓
Frontend creates Razorpay order via backend
    ↓
Backend calls Razorpay API → returns order_id
    ↓
Frontend opens Razorpay Checkout modal
    ↓
User completes payment
    ↓
Razorpay sends payment confirmation to backend webhook
    ↓
Backend verifies payment signature
    ↓
Order status updated to "paid"
    ↓
Collector fulfills order
```

---

## FRONTEND REQUIREMENTS

Create architecture for:
- Landing Page
- Authentication Pages
- Household Dashboard
- Organization Dashboard (School / University — shared)
- NGO Dashboard (with Drives section)
- Collector Dashboard
- Admin Dashboard
- Schedule Pickup
- Tracking
- Marketplace (Browse & Buy)
- Marketplace Seller View (Collector)
- Profile
- Settings
- Notifications

---

## DESIGN SYSTEM

**Theme:** Modern Sustainability Startup

**Characteristics:**
- Premium
- Clean
- Minimal
- Professional
- Environment-focused

### COLOR PALETTE

| Name | Hex |
|---|---|
| Primary Dark Green | #2C6E49 |
| Primary Green | #4C956C |
| Cream | #FEFEE3 |
| Soft Peach | #FFC9B9 |
| Earth Orange | #D68C45 |
| White | #FFFFFF |
| Black | #000000 |

### UI STYLE
- Modern SaaS
- Large Whitespace
- Rounded Corners
- Soft Shadows
- Glassmorphism
- Micro-interactions
- Framer Motion Animations
- Fully Responsive
- Mobile Friendly
- Accessibility Focused

---

## TEAM STRUCTURE

**Kritika** — Responsibilities: 45%
- Backend (Node.js / Express)
- MongoDB
- Cloudinary
- Gemini Vision
- Razorpay Integration

**Nrithya** — Responsibilities: 35%
- React Frontend
- Tailwind CSS
- UI/UX
- Framer Motion

**Adhitri** — Responsibilities: 20%
- Firebase Authentication
- Google Maps Integration
- Frontend/Backend Integration
- Testing
- Quality Assurance

---

## EXPECTED OUTPUT FROM ANALYSIS

Provide:
1. System Architecture Diagram
2. Folder Structure
3. Database Schema
4. API Endpoint Design
5. Component Hierarchy
6. User Flow Diagrams
7. Module Dependency Map
8. Development Roadmap
9. Integration Strategy
10. Deployment Strategy

Do not generate code. Do not implement features. Act as the Technical Architect for this project.
