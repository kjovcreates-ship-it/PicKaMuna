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
// A TURN relay is essential for reliable cross-network calls.
// Set these to credentials issued by YOUR TURN provider. Do not use fake values.
// For production, fetch short-lived TURN credentials from a secure backend;
// credentials embedded in a public static website can be copied by anyone.
export const turnConfig = {
  urls: [], // e.g. ['turn:relay.example.com:3478?transport=udp', 'turns:relay.example.com:5349?transport=tcp']
  username: '',
  credential: ''
};
const relay = turnConfig.urls.length && turnConfig.username && turnConfig.credential
  ? [{urls:turnConfig.urls,username:turnConfig.username,credential:turnConfig.credential}]
  : [];
export const iceServers = [
  {urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']},
  ...relay
];
export const hasTurn = relay.length > 0;
