/**
 * Firebase Admin Config
 */
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const storage = admin.storage();
const auth = admin.auth();

module.exports = { admin, db, storage, auth };
