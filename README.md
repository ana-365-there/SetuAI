# SetuAI

**Bridging citizens, universities, and industry to solve societal challenges together.**

SetuAI is a full-stack platform built for **Smart India Hackathon 2026 (PS 26043)** — sponsored by the Government of Jharkhand — that crowdsources societal challenges from citizens and government bodies, and connects them to universities and industry partners for collaborative problem-solving.

Instead of challenges sitting in a static submission box, SetuAI actively routes them to the right people: AI-assisted categorization matches problems to relevant universities, duplicate reports get merged instead of fragmenting engagement, and ranking systems surface both the most active problem-solvers and the most impactful contributing universities.

---

## Features

- **Challenge submission & tracking** — citizens, Panchayati Raj Institutions (PRIs), Urban Local Bodies (ULBs), and government departments can submit societal challenges with category, severity, location, and supporting images.
- **AI-based university categorization** — incoming challenges are automatically matched to universities best suited to work on them, based on domain and category similarity.
- **Deduplication** — near-identical challenge submissions are detected and merged, so effort and engagement consolidate around a single tracked issue instead of splintering across duplicates.
- **Role-based workflows** — distinct permissions and views for citizens, universities, industry partners, and admins, enforced end-to-end (not just hidden in the UI).
- **Status lifecycle** — challenges move through `Open → Under Review → In Progress → Solved`, with updates restricted to the university actually assigned to that challenge.
- **Industry engagement** — industry accounts can express interest in specific challenges, enabling academia–industry collaboration on solutions.
- **Upvoting** — community-driven prioritization of which challenges deserve attention first.
- **User & university rankings** — leaderboards recognizing the most active citizens/departments raising real issues, and the universities delivering the most solved challenges.

---

## Tech Stack

**Frontend**
- React (Vite)

**Backend**
- Node.js + Express
- MongoDB (Atlas) with Mongoose
- JWT-based authentication
- `express-validator` for request validation

**Infrastructure**
- MongoDB Atlas (database)
- Render (backend hosting)

---

## Project Structure

```
SetuAI/
├── src/                    # React frontend
├── public/
├── setuai-backend/
│   ├── data/
│   ├── middleware/
│   │   ├── fetchuser.js    # JWT auth middleware
│   │   └── checkRole.js    # role-based access control
│   ├── models/             # Mongoose schemas (Challenge, User, ...)
│   ├── routes/              # Express route handlers
│   ├── utils/
│   ├── tests/
│   ├── db.js                # MongoDB connection
│   └── index.js              # server entry point
├── index.html
├── vite.config.js
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js (LTS)
- A MongoDB Atlas cluster (free tier is sufficient) — no local MongoDB installation required

### 1. Clone the repo
```bash
git clone https://github.com/<your-org>/SetuAI.git
cd SetuAI
```

### 2. Backend setup
```bash
cd setuai-backend
npm install
```

Create a `.env` file in `setuai-backend/` (never commit this):
```env
MONGO_URI=your_atlas_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
BACKEND_URL= your_backend_url
```

Run the backend:
```bash
node index.js
```

### 3. Frontend setup
```bash
cd ..
npm install
npm run dev
```

---

## API Overview

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/challenges` | Citizen, University, Industry | Submit a new challenge |
| `GET` | `/challenges` | Public | List challenges (filterable, paginated) |
| `GET` | `/challenges/:id` | Public | Get a single challenge |
| `PUT` | `/challenges/:id/status` | Assigned University, Admin | Update challenge status |
| `PUT` | `/challenges/:id/assign` | University, Admin | Claim/assign a challenge |
| `PUT` | `/challenges/:id/upvote` | Authenticated | Upvote a challenge |
| `POST` | `/challenges/:id/express-interest` | Industry | Express interest in a challenge |

---

## Deployment

- **Backend:** Render (Web Service)
- **Database:** MongoDB Atlas
- **Frontend:** _add your deployment target here (e.g. Vercel/Netlify) once live_

---

## Team

Anahita Datta, Animesh Bharti, Aniket Kumar, Shivangi Gautam, Aditi Singh, Saisha Jaiswal

## License

_note this is a hackathon submission._
