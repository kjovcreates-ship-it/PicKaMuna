# PicKaMuna — Solo / Duo / Group

Static website ready for GitHub + Vercel. Uses the existing Firebase web configuration in `firebase-config.js`.

## Upload
Upload `index.html`, `style.css`, `app.js`, `together.js`, `group.js`, and `firebase-config.js` to the repository root. `README.md` and `firestore.rules` are optional for GitHub.

## REQUIRED: Firebase rules update
In Firebase Console → Firestore Database → Rules, replace your current rules with the complete contents of `firestore.rules` and click Publish. The new file **retains Duo rules** and adds `groupRooms` + `signals` rules. Without this update, group room creation will fail with permission-denied.

**SECURITY:** Rules are for controlled testing only, not a public production release. There is no Firebase Authentication, room-code authorization, signaling cleanup, rate limiting, or abuse protection. Room codes are not secret credentials. Secure these before opening the feature to the public.

## Group Booth test
1. Deploy to Vercel (HTTPS). Select `03 / GROUP BOOTH`.
2. Create a room on device 1; copy its invitation URL.
3. Open the link on devices 2–4 and click JOIN ROOM. Allow camera access on each device.
4. Wait until everyone's video shows LIVE. Host chooses `ONE SHOT EACH / 2×2` or `FOUR SHOTS / 4-CUT` and starts.
5. Customize film, paper, grain, frame, stickers, caption. Download PNG or JPG.

Group Booth supports 2–4 participants; for exactly two, the existing Duo Booth remains available. Collage takes one photo from each participant; the 4-cut mode captures four synchronized rounds, each with a 2×2 grid of participants.

## Known limitations
- Peer-to-peer WebRTC mesh: some networks need a TURN server (add to `iceServers` in `firebase-config.js`).
- No clock synchronization service; capture countdown can drift across devices due to device clocks and latency.
- Joining/leaving during a photo session can interrupt exports. Start a fresh round after everyone is connected.
- Abrupt browser closes can leave a stale room member until room recreation. Rooms expire in application logic after 24 hours, but Firestore documents are not automatically deleted.
- Group settings are local to each browser; each participant may choose their own visual styling for the same captured photos.
- Not verified with four physical devices. Test on real devices before sharing publicly.
