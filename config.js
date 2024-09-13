const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: process.env.PORT || 4000,
  firebaseBucketName: process.env.FIREBASE_BUCKET_NAME,
  firebaseDBUrl: process.env.FIREBASE_DB_URL,
  googleServiceAccount: process.env.GOOGLE_SERVICE_ACCOUNT,
};
// Load environment variables from the .env file into process.env
module.exports = {
  config,
};
