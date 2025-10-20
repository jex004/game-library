const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

// Initialize the Firebase Admin SDK
initializeApp();

// This is your Firebase App ID from your .env file
// IMPORTANT: You must set this in your function's environment variables!
const APP_ID = process.env.APP_ID; 

// This function will run every 5 minutes.
exports.cleanupInactiveRooms = onSchedule("every 5 minutes", async (event) => {
  logger.log("Running inactive room cleanup job.");

  if (!APP_ID) {
    logger.error("APP_ID environment variable not set. Aborting cleanup.");
    return;
  }

  const db = getFirestore();
  const roomsPath = `artifacts/${APP_ID}/public/data/rooms`;
  const roomsRef = db.collection(roomsPath);

  // Calculate the timestamp for 15 minutes ago
  const fifteenMinutesAgo = Timestamp.fromMillis(Date.now() - 15 * 60 * 1000);

  // Query for rooms where lastActivity is older than 15 minutes
  const inactiveRoomsQuery = roomsRef.where("lastActivity", "<=", fifteenMinutesAgo);

  const snapshot = await inactiveRoomsQuery.get();

  if (snapshot.empty) {
    logger.log("No inactive rooms found.");
    return;
  }

  // Use a batch to delete all inactive rooms at once
  const batch = db.batch();
  snapshot.forEach(doc => {
    logger.log(`Marking room for deletion: ${doc.id}`);
    batch.delete(doc.ref);
  });

  await batch.commit();

  logger.log(`Successfully deleted ${snapshot.size} inactive rooms.`);
});