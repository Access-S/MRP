// src/firebase.config.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbENjwAgsEfuyj9YYsvXlymmreB9ibCXo",
  authDomain: "myproductsdb.firebaseapp.com",
  projectId: "myproductsdb",
  storageBucket: "myproductsdb.firebasestorage.app",
  messagingSenderId: "770333830092",
  appId: "1:770333830092:web:7854e53cb83ea4d213cb69",
  measurementId: "G-L78308Z9YQ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
