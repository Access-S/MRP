import * as admin from 'firebase-admin';
import path from 'path'; // Step 1: Import the 'path' module

// Step 2: Build a reliable path from the directory where you run "npm run dev"
// process.cwd() gets the current working directory (which is 'backend/')
const serviceAccountPath = path.resolve(
  process.cwd(),
  'src/config/firebase-service-account.json'
);

// Step 3: Use the reliable path in the require statement
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export const firestoreDb = admin.firestore();

console.log('Firebase Admin SDK initialized.');