const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

initializeApp();

const APP_ID = process.env.APP_ID;

exports.cleanupInactiveRooms = onSchedule("every 5 minutes", async (event) => {
  logger.log("Running inactive room cleanup job.");

  if (!APP_ID) {
    logger.error("APP_ID environment variable not set. Aborting cleanup.");
    return;
  }

  const db = getFirestore();
  const roomsPath = `artifacts/${APP_ID}/public/data/rooms`;
  const roomsRef = db.collection(roomsPath);

  const fifteenMinutesAgo = Timestamp.fromMillis(Date.now() - 15 * 60 * 1000);

  const inactiveRoomsQuery = roomsRef.where("lastActivity", "<=", fifteenMinutesAgo);
  const snapshot = await inactiveRoomsQuery.get();

  if (snapshot.empty) {
    logger.log("No inactive rooms found.");
    return;
  }

  // --- MODIFICATION: Instead of a simple batch delete, we now loop through each room
  // and perform a full recursive delete for each one.
  const deletePromises = [];
  snapshot.forEach((doc) => {
    logger.log(`Starting recursive delete for room: ${doc.id}`);
    // The firebase CLI has a built-in recursive delete function we can use here.
    // This is the recommended way to delete a document and all its subcollections.
    const promise = db.recursiveDelete(doc.ref);
    deletePromises.push(promise);
  });

  // Wait for all the delete operations to complete.
  await Promise.all(deletePromises);

  logger.log(`Successfully deleted ${snapshot.size} inactive rooms and their subcollections.`);
});