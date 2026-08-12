# Eco Setu — Backend Directory Structure & Module Guide (v2)

> **Source of Truth:** PROJECT_SPEC.md (v2)

```
backend/
├── config/
│   ├── db.js                   # MongoDB Atlas connection setup
│   ├── firebase.js             # Firebase Admin SDK initialization
│   ├── cloudinary.js           # Cloudinary SDK configuration
│   ├── gemini.js               # Google Gemini Vision API initialization
│   └── razorpay.js             # Razorpay SDK initialization
│
├── controllers/
│   ├── index.js                # Placeholder / Export barrel
│   ├── authController.js       # Register, login sync, profile fetch
│   ├── userController.js       # User profile update & avatar upload
│   ├── pickupController.js     # Schedule pickup, accept, status flow, verify waste
│   ├── organizationController.js# Org registration & detail lookup
│   ├── materialController.js   # Collector marketplace listing CRUD
│   ├── orderController.js      # Marketplace buy orders & Razorpay payment verification
│   ├── driveController.js       # NGO collection drives CRUD & participation
│   ├── aiController.js         # Image classification endpoint handlers
│   ├── notificationController.js# Read/unread notifications
│   ├── reviewController.js     # Post reviews for pickups/orders
│   ├── analyticsController.js  # Sustainability dashboard impact data
│   ├── scrapRateController.js  # Base rate & market multiplier management (Admin)
│   └── adminController.js      # User management, collector verification, dispute resolution
│
├── middleware/
│   ├── index.js                # Export barrel
│   ├── authMiddleware.js       # verifyFirebaseToken()
│   ├── roleMiddleware.js       # checkRole(['household', 'organization', 'collector', 'admin']) & checkOrgType()
│   ├── uploadMiddleware.js     # Multer memory storage & image filter
│   └── errorMiddleware.js      # Global error handler
│
├── models/
│   ├── index.js                # Export barrel for Mongoose models
│   ├── User.js                 # User model (roles + organizationType)
│   ├── Pickup.js               # Pickup request lifecycle model
│   ├── ScrapRate.js            # Base pricing & market multipliers per category
│   ├── Organization.js         # Org profile model (NGO, School, University)
│   ├── Material.js             # Marketplace inventory listings (Collector sales)
│   ├── Order.js                # Marketplace purchase orders (Razorpay integrated)
│   ├── Drive.js                # NGO collection drives model
│   ├── Notification.js         # In-app notifications
│   ├── Review.js               # Ratings & feedback
│   └── Analytics.js            # Pre-aggregated platform stats
│
├── routes/
│   ├── index.js                # Export barrel
│   ├── authRoutes.js           # /api/auth
│   ├── userRoutes.js           # /api/users
│   ├── pickupRoutes.js         # /api/pickups
│   ├── organizationRoutes.js   # /api/organizations
│   ├── materialRoutes.js       # /api/materials
│   ├── orderRoutes.js          # /api/orders
│   ├── driveRoutes.js         # /api/drives
│   ├── aiRoutes.js             # /api/ai
│   ├── notificationRoutes.js   # /api/notifications
│   ├── reviewRoutes.js         # /api/reviews
│   ├── analyticsRoutes.js      # /api/analytics
│   ├── scrapRateRoutes.js      # /api/scrap-rates
│   └── adminRoutes.js          # /api/admin
│
├── services/
│   ├── index.js                # Export barrel
│   ├── firebaseService.js      # Token verification logic
│   ├── cloudinaryService.js    # Image stream upload & deletion
│   ├── geminiService.js        # Gemini Vision API prompt & response parser
│   ├── pricingService.js       # Dynamic pricing algorithm (Base rates, multipliers, quantity discounts)
│   ├── razorpayService.js      # Razorpay order creation & signature verification
│   ├── notificationService.js  # Dispatching in-app alerts
│   └── analyticsService.js     # CO2 saving & trees equivalent calculation logic
│
├── utils/
│   ├── index.js                # Export barrel
│   ├── helpers.js              # Formatting & response wrappers
│   └── constants.js            # Roles, org types, statuses, categories
│
├── validators/
│   ├── index.js                # Export barrel
│   ├── authValidator.js        # Registration payload rules
│   ├── pickupValidator.js      # Pickup creation rules
│   ├── orderValidator.js       # Marketplace order validation
│   └── driveValidator.js       # NGO drive creation validation
│
├── sockets/
│   └── index.js                # Real-time WebSockets (Live tracking/alerts)
│
├── uploads/
│   └── .gitkeep                # Temporary buffer folder
│
├── app.js                      # Express application setup
├── server.js                   # Entry point server
└── package.json
```
