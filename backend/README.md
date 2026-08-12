# Eco Setu — Backend API

> AI-Powered Circular Economy Platform — *Bringing Waste to Worth*

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | Web framework |
| MongoDB Atlas | Database (via Mongoose ODM) |
| Firebase Admin SDK | Authentication token verification |
| Cloudinary | Image storage & CDN |
| Google Gemini AI | Waste classification |
| Multer | File upload processing |
| Helmet | HTTP security headers |
| Morgan | Request logging |
| CORS | Cross-origin resource sharing |
| express-validator | Request body validation |
| cookie-parser | Cookie parsing |

## Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **MongoDB Atlas** cluster (connection string)
- **Firebase** project with service account JSON
- **Cloudinary** account
- **Google Gemini** API key

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy the template and fill in your values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) below for required values.

### 3. Place Firebase service account

Put your Firebase Admin SDK service account JSON file inside `config/`:

```
backend/config/your-firebase-adminsdk-xxxxx.json
```

Then set the path in `.env`:

```
FIREBASE_SERVICE_ACCOUNT_PATH=./config/your-firebase-adminsdk-xxxxx.json
```

### 4. Start the server

**Development** (with hot reload):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

### 5. Verify

Visit the health check endpoint:

```
http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Eco Setu API is running",
  "environment": "development",
  "timestamp": "2026-08-02T04:00:00.000Z"
}
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | ❌ | Server port (default: 5000) |
| `NODE_ENV` | ❌ | `development` or `production` (default: development) |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | ✅ | Path to Firebase service account JSON |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key (AI features disabled if not set) |
| `CORS_ORIGIN` | ❌ | Frontend origin URL (default: http://localhost:5173) |

## NPM Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `nodemon server.js` | Start with hot reload (development) |
| `npm start` | `node server.js` | Start without hot reload (production) |
| `npm test` | — | Run tests (not yet configured) |

## Folder Structure

```
backend/
├── config/             # External service configurations
│   ├── db.js           # MongoDB Atlas connection
│   ├── firebase.js     # Firebase Admin SDK init
│   ├── cloudinary.js   # Cloudinary SDK config
│   └── gemini.js       # Google Gemini AI init
├── controllers/        # Request handlers (no business logic)
├── middleware/          # Express middleware (auth, role, upload, error)
├── models/             # Mongoose schemas & models
├── routes/             # Express route definitions
├── services/           # Business logic & external API integrations
├── utils/              # Shared helpers & constants
├── validators/         # express-validator validation chains
├── sockets/            # WebSocket setup (future)
├── uploads/            # Temporary file buffer (auto-cleaned)
├── app.js              # Express app setup & middleware
├── server.js           # Entry point — starts everything
├── package.json        # Dependencies & scripts
├── .env                # Environment variables (git-ignored)
├── .env.example        # Env var template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Architecture

- **Pattern**: MVC + Service Layer
- **Auth**: Firebase ID Token → `verifyFirebaseToken()` middleware → role check
- **Images**: Multer buffer → Cloudinary upload → URL stored in MongoDB
- **AI**: Gemini Vision API (advisory only — users/collectors override)
- **Pricing**: ScrapRates collection (admin-managed) → auto-calculation at collection

## License

ISC
