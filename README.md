# Chronflow — Authentication-Based Stopwatch Timer

A full-stack web application where users create an account, log in securely, and track focused work sessions on a protected stopwatch dashboard. Built with vanilla JavaScript on the frontend and a Node.js/Express/MongoDB backend, with JWT-based authentication throughout.

## 📸 Screenshots

### 🔐 Login Page
<img width="1652" height="877" alt="Screenshot 2026-07-25 135947" src="https://github.com/user-attachments/assets/927a3394-3ee4-489c-a773-cc315de55778" />


---

### 📝 Register Page
<img width="1591" height="890" alt="Screenshot 2026-07-25 140031" src="https://github.com/user-attachments/assets/57f96391-a483-43db-a5d4-52cc1c439e88" />


---

### 🏠 Dashboard
<img width="1663" height="770" alt="Screenshot 2026-07-25 135712" src="https://github.com/user-attachments/assets/4dd9bc17-a96f-44e3-a1e3-e04ad7ae6a54" />


---

### 📊 Dashboard (Statistics & Overview)
<img width="1622" height="395" alt="Screenshot 2026-07-25 135828" src="https://github.com/user-attachments/assets/d3376e59-8427-47dc-a1e2-0f506e4ea700" />


---

### ⏱️ Stopwatch Running
<img width="1618" height="896" alt="Screenshot 2026-07-25 140259" src="https://github.com/user-attachments/assets/51b266bb-8357-4dcd-ba51-d98272ab7999" />



---

### 👤 User Profile
<img width="1572" height="862" alt="Screenshot 2026-07-25 140335" src="https://github.com/user-attachments/assets/3c58e89a-7837-4cb9-95c0-1d9043c76d60" />


---

### 🌗 Theme Toggle (Light Mode)
<img width="1606" height="887" alt="Screenshot 2026-07-25 140458" src="https://github.com/user-attachments/assets/279b0aab-e001-47c6-a0a6-8cd173961529" />


---

## Features

- **Secure authentication** — registration, login, and logout backed by JWT (stored in an httpOnly cookie) and bcrypt password hashing
- **Protected routes** — the dashboard and profile pages are guarded both client-side and server-side; direct navigation to `/dashboard` without a valid session redirects to `/login`
- **Full stopwatch functionality** — Start, Stop, Resume, and Reset, built on `setInterval`/`clearInterval` with a single guarded interval reference so multiple timers can never stack
- **Remember Me** — extends JWT expiry from 1 day to 30 days
- **Dark / light theme** — persisted per-browser via `localStorage`
- **User profile page** — name, email, account creation date, last login time
- **Lifetime stopwatch usage** — accumulated focus time is saved to the user's account in the database
- **Toast notifications** — for registration, login, and error states
- **Password visibility toggle** — on every password field
- **Forgot password flow** — token-based reset (two-step UI)
- **Fully responsive** — down to small mobile viewports
- **🍂 Falling Leaves particle effect & customizer** — full-screen seasonal animation powered by `falling-leaves` with live customization for leaf shapes (maple, oak, ginkgo, birch, oval), custom image uploads (logo, pet, stickers), color presets, wind, speed, and leaf density with localStorage persistence

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Auth | JWT (`jsonwebtoken`), httpOnly cookies |
| Password security | bcryptjs |

No frontend frameworks, no UI libraries, no auth-abstraction libraries — every piece of the authentication flow is implemented and readable in `server/`.

## Project Structure

```
Stopwatch-App/
├── client/
│   ├── index.html            # Landing page
│   ├── login.html
│   ├── signup.html
│   ├── forgot-password.html
│   ├── dashboard.html        # Protected — stopwatch
│   ├── profile.html          # Protected — account details
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── utils.js          # Theme, toasts, fetch wrapper, validators
│   │   ├── auth.js           # Signup + login form logic
│   │   ├── forgot-password.js
│   │   ├── dashboard.js      # Stopwatch engine
│   │   └── profile.js
│   └── assets/
├── server/
│   ├── app.js                 # Express app entry point
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── authMiddleware.js   # protect (API) + protectPage (HTML routes)
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── authRoutes.js
│   └── utils/
│       └── generateToken.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Setup & Installation

### Prerequisites
- Node.js (v18+)
- A MongoDB instance — local (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Stopwatch-App

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Edit .env and set MONGO_URI and JWT_SECRET
```

`.env`:
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/stopwatch-app
JWT_SECRET=replace_this_with_a_long_random_secret_key
CLIENT_ORIGIN=http://localhost:5000
```

```bash
# 4. Run the server
npm run dev     # with nodemon, auto-restarts on file changes
# or
npm start       # plain node
```

Visit `http://localhost:5000` in your browser.

## API Documentation

All endpoints are prefixed with `/api/auth`. Authenticated endpoints expect the JWT cookie set automatically at login (no manual header needed if calling from the browser).

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/register` | No | Create a new account |
| POST | `/login` | No | Authenticate and receive a session cookie |
| POST | `/logout` | No | Clear the session cookie |
| GET | `/profile` | Yes | Return the logged-in user's details |
| PATCH | `/stopwatch-time` | Yes | Add elapsed seconds to the user's lifetime total |
| POST | `/forgot-password` | No | Generate a password-reset token |
| POST | `/reset-password` | No | Reset password using a valid token |

**Example — Register**
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

**Example — Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "SecurePass123",
  "rememberMe": true
}
```

## 🍂 Falling Leaves Interactive Effect

Powered by [`falling-leaves`](https://www.npmjs.com/package/falling-leaves), Chronflow includes an interactive seasonal leaf particle effect across every page with a dedicated control panel:

- **🍁 Built-in Leaf Shapes**: Choose between Maple, Oak, Ginkgo, Birch, or Oval foliage
- **🖼️ Custom Image Upload**: Upload any custom image (logo, pet, stickers, avatar) to drift across the screen
- **🎨 Color Themes**: Choose from Autumn Glow, Golden Ginkgo, Forest Emerald, Cherry Blossom, or pick a custom hex color
- **🌬️ Wind Breeze & Speed**: Real-time slider controls for breeze direction (blowing left, calm, or blowing right) and fall speed (gentle to storm)
- **🍂 Leaf Count**: Adjust particle count dynamically from 5 up to 80 leaves
- **💾 State Persistence**: Automatically preserves your preferences (on/off, chosen shape, colors, sliders) in `localStorage`
- **👆 Non-Intrusive**: Canvas runs with `pointer-events: none` so all stopwatch controls, inputs, and links remain fully clickable

```javascript
import { FallingLeaves } from 'falling-leaves';

new FallingLeaves();
```

## 🔗 Project Links

**🔗 GitHub Repository:**
https://github.com/ChaudhariHet/Authentication-Based-Stopwatch-Timer-Web-Application

**🌐 Live Demo:**
https://authentication-based-stopwatch-timer-web.onrender.com/

---

## Security Notes

- Passwords are hashed with bcrypt (12 salt rounds) — never stored in plaintext
- JWTs are stored in **httpOnly** cookies, not `localStorage`, to reduce XSS-based token theft
- Login and registration return identical, generic error messages for "no such user" vs. "wrong password," preventing email enumeration
- All routes that touch user data are protected by JWT-verification middleware on the server — client-side checks are a UX convenience, not the actual security boundary
- Server errors are logged internally and never leaked to the client in raw form


## Future Improvements

- Email delivery for the forgot-password flow (currently returns the reset token directly in the API response, since no mail service is configured)
- Session history — a log of individual stopwatch sessions, not just a lifetime total
- Rate limiting on auth endpoints to slow down brute-force attempts
- Automated test suite (Jest + Supertest for the API, Playwright for E2E)
- Refresh tokens for smoother long-lived sessions instead of relying solely on a long-expiry JWT

## License

This project is licensed under the MIT License.
