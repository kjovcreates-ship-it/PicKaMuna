# PicKaMuna — Retro Photobooth

A static, privacy-friendly four-shot photobooth website with a retro design.

## Features
- Webcam/mobile camera with camera picker
- 3, 5, or 10 second countdown before each of four shots
- Live strip preview, five filters, five paper colors, three frame styles
- Custom caption, start-over/retake entire session, high-resolution PNG export
- Responsive layout, no account, no server, no photo uploads

## Deploy to Vercel
1. Unzip this folder.
2. Import the folder into a GitHub repository (put `index.html` at the repo root).
3. On Vercel, click **Add New > Project**, import the repo, choose **Other** as framework, leave build command empty, and deploy.
4. Visit the HTTPS URL and allow camera permission.

You can also deploy the folder with the Vercel CLI (`vercel --prod`).

## Run locally
Use a localhost server, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000`.
Opening the HTML via `file://` may prevent camera access. HTTPS or localhost is required.

## Notes
- Photos remain in browser memory until the page is closed; none are uploaded.
- The **Start over** button retakes the whole four-shot session, not individual shots.
- External Google Fonts are used for typography; the app still functions without them.
- Downloaded PNG dimensions are 1440 px wide and vary in height with the frame style.
