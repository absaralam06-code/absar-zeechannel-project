# 📺 ZEE5 Live TV Hub

A sleek, responsive, and modern Live TV streaming web application and API explorer powered by ZEE5 APIs, HLS.js, and an Express proxy backend.

---

## 🌟 Key Features
- **47 Verified 100% Free Live Channels** in India (FAST Movies, National & Regional News, 24/7 Devotional Live Darshan).
- **HLS Live Streaming Engine** with adaptive bitrate streaming (up to 1080p Full HD).
- **Live Channel Filtering**: Filter by Verified Free Live, Premium Pay-TV, and Region-Locked International Feeds.
- **Search & Multi-Language Support**: Hindi, English, Marathi, Telugu, Tamil, Punjabi, Bengali, Gujarati, and more.
- **Integrated API Explorer**: Test ZEE5 APIs directly within the app.

---

## 🚀 1-Click Free Cloud Deployment (24/7 Live)

### Option 1: Deploy on Render.com (Recommended - 100% Free)
1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git
   git branch -M main
   git push -u origin main
   ```
2. Go to **[Render.com](https://render.com)** and sign in with GitHub.
3. Click **New +** -> **Web Service** -> Select your repository.
4. Render will automatically detect the settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**. Within 2 minutes, your app will be live at:
   `https://<your-app-name>.onrender.com`

---

### Option 2: Deploy on Vercel
1. Install Vercel CLI (or connect your GitHub repo at [vercel.com](https://vercel.com)):
   ```bash
   npx vercel
   ```
2. Follow the prompts. Your app will be live globally on Vercel's high-speed CDN.

---

### Option 3: Deploy with Docker
```bash
docker build -t zee5-live-tv .
docker run -p 3000:3000 zee5-live-tv
```

---

## 💻 Local Development
```bash
# Install dependencies
npm install

# Start development server
npm start
# or with auto-restart
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
