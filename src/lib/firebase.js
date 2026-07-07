import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Config do projeto Firebase (a apiKey do web é pública por natureza — a segurança
// vem das regras do Firestore/Storage, não de esconder isso).
const firebaseConfig = {
  apiKey: 'AIzaSyDPTj8tGZ-jCIGQ41CnkY3Qr1ZL6fbuEfw',
  authDomain: 'projeto-3d-295d9.firebaseapp.com',
  projectId: 'projeto-3d-295d9',
  storageBucket: 'projeto-3d-295d9.firebasestorage.app',
  messagingSenderId: '879178649957',
  appId: '1:879178649957:web:38f953c3230df14c52918c',
  measurementId: 'G-E7GBME3SQX',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
