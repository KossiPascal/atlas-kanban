// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
import { Firestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRKb0r3SGfxqU1KWxXQSvim9e9OnC2UQI",
  authDomain: "atlas-kanban-857d0.firebaseapp.com",
  projectId: "atlas-kanban-857d0",
  storageBucket: "atlas-kanban-857d0.firebasestorage.app",
  messagingSenderId: "881739679431",
  appId: "1:881739679431:web:78659c66d79e52bb6520e2",
  measurementId: "G-JVT6KQ9ZNN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Get a list of cities from your database
async function getCities(db: Firestore) {
    const citiesCol = collection(db, 'cities');
    const citySnapshot = await getDocs(citiesCol);
    const cityList = citySnapshot.docs.map(doc => doc.data());
    return cityList;
}

// https://firebase.google.com/docs/web/setup?hl=fr&authuser=0&_gl=1*g4dt0f*_ga*NTYwOTgwMjYwLjE3NTgzMzg4NTY.*_ga_CW55HF8NVT*czE3NTgzMzg4NTYkbzEkZzEkdDE3NTgzMzk5MDkkajckbDAkaDA.