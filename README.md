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


## Group live-video performance update
Group camera requests now target 640x480 at 15 fps and each outgoing peer connection attempts to cap video bitrate at 300 kbps. If the device rejects the constrained camera request, it falls back to default video. Photo transfer and composition are unchanged. These caps can improve upload bandwidth use but cannot eliminate all lag, especially with poor networks or without a TURN relay. Test 2, 3, and 4 devices on actual networks.


## Connection reliability update
- Duo and Group now attempt up to four ICE restarts when a connection drops.
- Group restart negotiation is initiated only by the deterministic offerer to reduce collisions.
- STUN fallback list expanded. **A TURN server is NOT bundled**: to make cross-network calls reliably, supply valid TURN credentials in `firebase-config.js` (`turnConfig`).
- Do not publicly deploy long-lived TURN secrets in frontend code. Use short-lived credentials delivered by a trusted backend for production.
- Existing Firestore rules remain unchanged; these are insecure demo rules and should not be used for a public launch.
- ICE restart cannot recover a closed browser tab, expired room, unavailable network, or unsupported relay route.
- This update was syntax-checked, but requires real-device tests across Wi-Fi and mobile data.


## Monochrome 2.0 redesign
UI-only CSS/HTML update inspired by the approved preview. Preserves JavaScript modules and Firebase settings from Connection Fix. GA4 G-FWP5VDNRZE in index.html. Hero images are stylized placeholders, not actual visitor photos. TURN relay still requires provider credentials.


Sticker collection update: Added Flowers, Moons, Bolts, Dots, XOXO and Clovers across Solo, Duo and Group, including exported images. No changes to WebRTC, Firebase, or Analytics.


## Sticker density (new)
All three booths offer Minimal (3), Balanced (6, default), and Decorated (11) stickers. Solo previews use the same deterministic sticker positions as the exported PNG/JPG canvas. Duo and Group use their canvas composition for both previews and exports. `sticker-engine.js` must be deployed alongside the other JavaScript files. Solo density is saved with local preferences.


## Preview / download matching fix
Completed Solo strips now preview the **same Canvas composition** used for PNG/JPG export. This fixes differing sticker positions, image crops, borders, and paper layout caused by separate CSS and Canvas renderers. Tap a photo in the finished preview to select it for retaking. Duo and Group already render previews through their export Canvas pipeline. JPEG compression may slightly change pixel colors versus the PNG preview.

Sticker contrast update: all booth canvas compositions now render stickers with dual contrasting keylines so stickers remain visible on all paper colors and over light/dark photo areas. The shared renderer keeps preview and export consistent.


## Reliability maintenance update
- Guard against repeated room create/join actions while an operation is running.
- Duo and Group photo chunks now include expected lengths and acknowledge receipt; unacknowledged photos are retransmitted while the channel is open.
- Room documents include a `deleteAfter` Timestamp for optional Firestore TTL; enable the TTL policy separately.
- See SECURITY-SETUP.md. The currently deployed Firestore rules remain unchanged to avoid silently breaking existing rooms.
- TURN is NOT activated without valid provider credentials.
- Static syntax checks are not substitutes for real browser / multiplayer testing.

### Sticker picker update
Sticker choices now expand/collapse in Solo, Duo and Group. Dots and XOXO were removed; existing saved preferences for removed styles fall back to None. Sticker density and exports remain unchanged.

## Mixed sticker designs
Sticker chooser now supports multiple selected designs in Solo, Duo and Group. Click a selected design again to remove it; NONE clears all selections. Light/Medium/Heavy set the total sticker count, shared across selected designs. Previews and PNG/JPG exports use the same deterministic sticker engine. Solo selections are saved to local preferences.

Sticker update: XO is available again as a selectable design in Solo, Duo and Group, including mixed selections and exports.
