# PicKaMuna Together

Solo photobooth plus a prototype long-distance two-person booth.

## Deploy
Upload all files at the root of your GitHub repository, then deploy on Vercel (Framework: Other). No npm or build step required. HTTPS is required for cameras.

## Firebase setup
The Firebase web app config is already filled in `firebase-config.js`. This is a public browser configuration, not a service-account credential.

1. Firebase Console → Build → Firestore Database → Create database (if not already created).
2. Firestore → Rules: copy `firestore.rules`, then Publish. **These rules are a temporary demo and are NOT suitable for public launch.** They allow anyone knowing a room code to modify room signaling. Do not use for sensitive photos.
3. Redeploy and test with two separate devices/browsers on HTTPS. Create room on one, join with the code on the other. Grant camera access to both.
4. For a real public launch, add authentication, room ownership/membership checks, expiration/cleanup, abuse controls, and a TURN service for difficult networks.

## Notes
- Solo mode works without Firebase.
- Together mode uses WebRTC for live video and photo exchange, Firestore for connection signaling.
- Firestore does not store the photo images; photos are sent to the other participant through the peer connection.
- Browser restrictions may require clicking the remote video to allow playback.
- Without a TURN server, two devices on different networks may fail to connect.
- The shared session uses an approximate coordinated countdown and is not frame-perfect synchronized.
- The two-person workflow has not been end-to-end tested with real devices.
- Keep the retro design and Developed by Kjov portfolio footer.
