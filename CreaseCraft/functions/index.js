const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

exports.sendAnnouncementNotification = onDocumentCreated("announcements/{annId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return null;

  const announcement = snapshot.data();
  const title = announcement.title || "New Club Announcement";
  const message = announcement.message || "Check the announcements tab for details.";
  const clubId = announcement.clubId;
  const targetSquadId = announcement.targetSquadId || announcement.squadId || null; 

  console.log(`=== START NOTIFICATION EVALUATION ===`);
  console.log(`Announcement ID: ${event.params.annId}`);
  console.log(`Club ID: ${clubId} | Target Squad ID: ${targetSquadId}`);

  try {
    const usersSnapshot = await db.collection("users").where("fcmPushEnabled", "==", true).get();
    const tokens = [];

    for (const docSnap of usersSnapshot.docs) {
      const userData = docSnap.data();
      const userId = docSnap.id;
      const userToken = userData.fcmToken;
      
      if (!userToken) continue;

      let shouldReceive = false;

      if (clubId) {
        const membershipsSnap = await db.collection("memberships")
          .where("userId", "==", userId)
          .where("clubId", "==", clubId)
          .get();

        if (!membershipsSnap.empty) {
          if (!targetSquadId || targetSquadId.toLowerCase() === 'all' || targetSquadId === '') {
            shouldReceive = true; // Club-wide broadcast
          } else {
            // Specific squad check
            membershipsSnap.forEach(mDoc => {
              const mData = mDoc.data();
              const userSquads = mData.squadIds || [];
              if (userSquads.includes(targetSquadId)) {
                shouldReceive = true;
              }
            });
          }
        }
      } else {
        shouldReceive = true;
      }

      // STRICT ENFORCEMENT: Only push token if shouldReceive is explicitly true
      if (shouldReceive === true) {
        tokens.push(userToken);
        console.log(`[INCLUDE] User ${userId} (${userData.email || 'no email'}) matched. Token added.`);
      } else {
        console.log(`[EXCLUDE] User ${userId} (${userData.email || 'no email'}) filtered OUT.`);
      }
    }

    const uniqueTokens = [...new Set(tokens)];
    console.log(`Total unique tokens to send: ${uniqueTokens.length}`);

    if (uniqueTokens.length === 0) {
      console.log("No matching target FCM tokens found.");
      return null;
    }

    const payload = {
      notification: {
        title: `📢 ${title}`,
        body: message
      },
      tokens: uniqueTokens 
    };

    const response = await getMessaging().sendEachForMulticast(payload);
    console.log(`Successfully sent push notifications. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Token at index ${idx} failed with error:`, resp.error);
        }
      });
    }
    return null;
  } catch (error) {
    console.error("Error in push notification function:", error);
    return null;
  }
});