# Security and operations checklist

The existing firestore.rules file is still the current permissive testing version. **Do not use it for a public launch.**

The optional `firestore.hardened.example.rules` is a STARTING POINT, not a complete production access-control solution. It requires anonymous Firebase Authentication and rules validation in the Firebase Rules Playground/emulator. Merely requiring authentication does not prove that a user belongs to a room.

For production, bind each member to an authenticated UID, enforce host/guest roles and permitted signal recipients, validate document sizes and types, and limit room creation. Consider Firebase App Check and rate limiting. This needs a coordinated schema/authentication migration and cannot be safely achieved by swapping the rules file alone.

Room documents now have `deleteAfter` Firestore Timestamp. Enable a Firestore TTL policy for collection groups `photoboothRooms` and `groupRooms` using field `deleteAfter`. **Firestore TTL does not recursively delete candidate or signals subcollections.** Use a scheduled backend cleanup for those. Existing rooms without the timestamp will not be cleaned by TTL.

A real TURN service is still required for some network combinations. Configure short-lived TURN credentials via a backend; do not publish permanent secrets in the JS bundle.

Test Duo/Group on different networks and actual iOS/Android devices before production.
