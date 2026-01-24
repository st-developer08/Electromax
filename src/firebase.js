import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCvXUqGuKIC4FlePZGgtT9-pvLMQg7tDnM",
  authDomain: "electromax-9554f.firebaseapp.com",
  projectId: "electromax-9554f",
  storageBucket: "electromax-9554f.firebasestorage.app",
  messagingSenderId: "445624212929",
  appId: "1:445624212929:web:4f9851a6e09365c306a340"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
