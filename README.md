# PicKaMuna
A retro-inspired four-shot photobooth, built with plain HTML/CSS/JavaScript. No backend or build tools needed.

## Deploy to Vercel
Upload the contents of this folder (index.html, style.css, app.js) to the root of a GitHub repository. Import it into Vercel using the **Other** framework preset and deploy. You can also use Vercel's static deployment workflow.

## Camera troubleshooting
- Camera permissions work on HTTPS and localhost, not usually file:// or ordinary HTTP.
- Open the HTTPS Vercel deployment, click **TURN CAMERA ON**, and allow permission in the browser prompt.
- If previously blocked, change camera permission for your site in the browser's site settings.
- Close Zoom/other apps using the camera, or switch the camera selector.
- In some in-app browsers or embedded previews, camera access is unavailable; open the deployed URL in Safari or Chrome directly.
- If you are inside an iframe, the host must allow `camera` via Permissions Policy and iframe `allow="camera"`.

## Features
Four timed captures, selectable camera, five live photo filters, five paper colors, three frame styles, custom caption, and client-side PNG download. Photos never upload to a server.

Footer attribution links to https://kjovcreates.vercel.app.
