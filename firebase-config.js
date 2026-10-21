// Paste the Web app config from Firebase Console → Project settings → Your apps.
// This is a public client configuration, NOT an admin key or service-account key.
export const firebaseConfig = {
  apiKey: 'AIzaSyDL38K-8I8JdAw_QUrMaHMcOqOFwBYODxE',
  authDomain: 'pickamuna.firebaseapp.com',
  projectId: 'pickamuna',
  storageBucket: 'pickamuna.firebasestorage.app',
  messagingSenderId: '1093384538309',
  appId: '1:1093384538309:web:f912ec30b69e689c2cc8ac',
  measurementId: 'G-FWP5VDNRZE'
};
// Optional: add a TURN server for better cross-network connectivity.
// Example: {urls:'turn:your-server:3478', username:'...', credential:'...'}
export const iceServers = [{urls:'stun:stun.l.google.com:19302'}];
