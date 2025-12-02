/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import * as admin from "firebase-admin";

admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Function to validate invite and set 'police' role
export const validateInvite = onRequest(async (req, res) => {
  const { uid, inviteCode } = req.body;

  // Check invite code in Firestore (e.g., a 'invites' collection)
  const inviteRef = admin
    .firestore()
    .collection("invites")
    .where("code", "==", inviteCode)
    .limit(1);
  const inviteSnap = await inviteRef.get();

  if (inviteSnap.empty) {
    res.status(400).send("Invalid invite code");
    return;
  }

  // Set custom claim
  await admin.auth().setCustomUserClaims(uid, { role: "police" });

  // Update Firestore role for consistency
  await admin.firestore().doc(`users/${uid}`).update({ role: "police" });

  // Delete used invite
  await inviteSnap.docs[0].ref.delete();

  res.send("Role set to police");
});

// Function for admin to promote user to police (call from admin dashboard)
export const promoteToPolice = onRequest(async (req, res) => {
  const { uid } = req.body;
  // Auth check: Ensure caller is admin (use custom claims)
  // ...

  await admin.auth().setCustomUserClaims(uid, { role: "police" });
  await admin.firestore().doc(`users/${uid}`).update({ role: "police" });
  res.send("Promoted to police");
});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
