# 💠 Stellar Equity Marketplace

A decentralized platform that lets startups **tokenize their equity** on the **Stellar blockchain**.  
Investors can buy, sell, and relist these tokens securely — with all share transfers handled on-chain instead of a central database.

---

## 🧩 Features

- 🪙 On-chain share trading (no centralized DB storage)
- 🏢 Company listing and investment flow
- 🧑‍💼 Admin dashboard for platform management
- ⚖️ Inflation-free token model
- 💬 (Optional) AI investment assistant for intelligent trade execution

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React, TailwindCSS |
| Backend | Express.js, Node.js |
| Blockchain | Stellar SDK |
| Database | PostgreSQL |

---

## 🧱 Project Setup

Follow these steps to run the project locally:

### **1️⃣ Clone the Repository**
```bash
git clone https://github.com/<your-username>/stellark.git
cd stellark
````

### **2️⃣ Install Dependencies**

For backend:

```bash
cd backend
npm install
```

For frontend:

```bash
cd ../frontend
npm install
```

### **3️⃣ Configure Environment**

Create a `.env` file inside both `backend/` and `frontend/` directories.

**Backend `.env` example:**

```
PORT=7042
STELLAR_NETWORK=testnet
STELLAR_SECRET_KEY=<your-stellar-secret>
DATABASE_URL=postgres://user:password@localhost:5432/stellar_equity
```

**Frontend `.env` example:**

```
VITE_BACKEND_URL=http://localhost:7042
```

### **4️⃣ Start the Backend**

```bash
pm2 start server.js --name "stellar-backend"
```

or run without PM2:

```bash
npm start
```

### **5️⃣ Start the Frontend**

```bash
npm run dev
```

Then visit → **[http://localhost:5173](http://localhost:5173)**

---

## 🚀 25-Day Roadmap

### **Phase 1: Core Improvements (Days 1–5)**

* Move **share relisting** from database to **on-chain** (Stellar).
* Fix minor bugs and improve overall stability.

🟩 *Outcome:* Reliable on-chain relisting and a stable working version.

---

### **Phase 2: Dashboard & Management (Days 6–12)**

* Add an **Admin Dashboard** for company and user management.
* Improve UI consistency and error handling.

🟩 *Outcome:* Simplified monitoring and control for admins.

---

### **Phase 3: Listing Flow & Token Economics (Days 13–18)**

* Improve **company listing flow** for better UX.
* Make the system **inflation-free** by refining token mint logic.

🟩 *Outcome:* Cleaner token economy and smoother onboarding for startups.

---

### **Phase 4: Testing & Deployment (Days 19–25)**

* End-to-end testing of listings, investments, and relisting.
* Fix edge cases and prepare for public demo.

🟩 *Outcome:* Stable, demo-ready platform with on-chain equity trading.

---

### **Optional (If Time Permits): Agentic AI Integration**

If time allows, prototype an **AI-powered investment assistant** that can:

* Analyze token trends and market engagement.
* Suggest startups to invest in.
* Execute investor commands (e.g., “Buy 50 tokens if price < 2 XLM”).

🟩 *Outcome:* Early version of an intelligent, agent-driven investment system.

---

## 👥 Contributors

* **Divyansh Jindal**
* *Sachit Bansal*

---