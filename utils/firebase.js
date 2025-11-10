import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config(); // Carga las variables del archivo .env

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const sendPushNotification = async (tokens, title, body, data = {}) => {
  try {
    const tokensArray = Array.isArray(tokens) ? tokens : [tokens];
    const message = {
      notification: { title, body },
      data,
      tokens: tokensArray,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("✅ Notificaciones enviadas:", response.successCount);
    if (response.failureCount > 0) {
      const failedTokens = tokensArray.filter((_, i) => !response.responses[i].success);
      console.log("❌ Tokens fallidos:", failedTokens);
    }
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        console.error(`❌ Error con token ${tokensArray[idx]}:`, res.error.message);
      }
    });
    return response;
  } catch (error) {
    console.error("❌ Error enviando notificación:", error);
  }
};
