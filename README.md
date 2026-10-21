# PicKaMuna Plus

A retro, browser-based photobooth. Static HTML, CSS and JavaScript; no build step or backend.

## Deploy
Upload `index.html`, `style.css`, and `app.js` to the root of a GitHub repository. Import the repository in Vercel with Framework Preset **Other**. Camera access requires HTTPS or localhost.

## Features
- Working camera playback flow retained from the PicKaMuna Playback Fix
- Automatic photo sessions with 2, 4 or 6 shots (2x2 uses 4)
- Select any captured photo in the preview, then click **RETAKE SELECTED**
- Film flash and optional synthesized shutter click
- Mirror final capture toggle
- Film filters, grain intensity, paper colors, frames and illustrated sticker stamps
- PNG and JPEG downloads with the selected layout and effects
- Keyboard: Space starts a session, R retakes the selected shot (when not typing)
- Local storage remembers visual preferences; captured images stay in browser memory and are not uploaded
- Developed by Kjov footer links to https://kjovcreates.vercel.app

## Notes
Changing layout clears the existing session because it can change the photo count. Selecting a photo highlights it in orange. Browser autoplay policies may restrict shutter sound until after user interaction. Some device/browser combinations may require camera permission to be granted again.

## Privacy
Images are processed locally in your browser; no photo upload is implemented.
