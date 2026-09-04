# ZEE5 Live TV Hub

A web application and API proxy for streaming live television channels with HLS.js and an Express backend.

## Features
- 47 verified live channels playable without subscription (FAST movie channels, news networks, and devotional livestreams)
- Adaptive bitrate HLS streaming with auto quality selection (up to 1080p)
- Filter catalog by language, genre, and access type (Free Live, Premium, Region-Locked)
- In-browser API explorer for testing backend endpoints

## Cloud Deployment

### Deploy on Render (Free)
1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. Log in to [render.com](https://render.com) and create a **New Web Service**.
3. Select your repository. Render will automatically detect:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Click **Create Web Service**.

### Deploy on Vercel
```bash
npx vercel
```

### Docker
```bash
docker build -t zee-tv .
docker run -p 3000:3000 zee-tv
```

## Local Setup
```bash
npm install
npm start
```

Access the app at `http://localhost:3000`.
