# Smart Factory Joint Partner Recommendation Agent (Tech Mahindra SFS)

An enterprise-ready, professional AI-powered portal designed to match client requirements and business challenges with the best-fit technology partners. Authenticated with dual-model support for Anthropic Claude and Google Gemini (featuring a generous free tier).

---

## 🌟 Key Features

* **AI-Powered Fitment Analysis**: Describe a client problem or upload files (PDF, DOCX, SOW, RFP) to automatically extract requirements and rank matching partners.
* **Side-by-Side Comparison**: Select 2–4 partners to perform a comprehensive AI comparison detailing strengths, risks, differentiators, and engagement approaches.
* **Interactive Partner Database**: Full CRUD capabilities, advanced filtering (by industry, tier, capabilities), and spreadsheet imports (CSV/XLSX) with smart column mapping.
* **Rich Dashboard & Analytics**: Dynamic HSL color-coded score rings, SVG distribution charts, and a recent activity feed.
* **Professional Executive Design**: Styled directly after Tech Mahindra SFS branding with a Crimson Red (`#D01C24`) accent, clean typography, and a toggleable **Light & Dark Theme** switch.
* **One-Click Export**: Save and print professional PDF or Excel reports for stakeholders.

---

## 🚀 How to Run Locally

### 1. Set Up Environment Variables
Create a `.env` file in the `server` directory and add your API keys:
```env
# Google Gemini API Key (Recommended for Free Tier)
GEMINI_API_KEY=your-gemini-api-key

# Anthropic Claude API Key (Optional)
ANTHROPIC_API_KEY=your-claude-api-key

# Server Port
PORT=3001
```

### 2. Start the Development Servers
In the project root directory, run:
```bash
# Install dependencies
npm run install:all

# Start both backend (3001) and frontend (5173) with hot reloading
npm run dev
```

* **Frontend Dashboard**: `http://localhost:5173`
* **Backend API Server**: `http://localhost:3001`

---

## ☁️ Free Cloud Deployment Guide (Render)

This application is fully consolidated to run as a single Express process, making it eligible for **100% Free Hosting** (no charges or credit card required) on [Render](https://render.com/).

### Step 1: Push Code to GitHub
Ensure your local code changes are committed and pushed to a repository on GitHub (excluding `.env` and `node_modules`).

### Step 2: Create a Web Service on Render
1. Log in to [Render](https://render.com/) (using your GitHub account is recommended).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   * **Name**: `partnership-fitment-agent` (or your preferred name)
   * **Region**: Choose the region closest to you
   * **Branch**: `main` (or your active branch)
   * **Runtime**: `Node`
   * **Build Command**: `npm run build`
   * **Start Command**: `npm run start`
   * **Instance Type**: Select **Free** ($0/month)

### Step 3: Configure Environment Variables
1. Scroll down to the **Environment Variables** section on Render (or click the **Env** tab after creating the service).
2. Add your Gemini key:
   * **Key**: `GEMINI_API_KEY`
   * **Value**: `your-gemini-api-key` *(Your Gemini API key)*
3. Add other optional variables:
   * **Key**: `NODE_ENV`
   * **Value**: `production`
   * **Key**: `PORT`
   * **Value**: `10000` *(Render set default)*

### Step 4: Deploy!
Click **Deploy Web Service**. Render will automatically:
1. Pull your code from GitHub.
2. Run `npm run build` to compile the React frontend into static assets and install server dependencies.
3. Serve the Express backend on `port 10000` (or Render's assigned port).
4. Serve the React frontend directly from the same server, routing all requests appropriately.

Once the build is complete, you will receive a free public URL (e.g., `https://partnership-fitment-agent.onrender.com`) accessible from anywhere in the world!
