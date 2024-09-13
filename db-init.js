const admin = require('firebase-admin');
const { config } = require('./config');

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(config.googleServiceAccount)),
  databaseURL: config.firebaseDBUrl,
});

const bucketName = config.firebaseBucketName;

const db = admin.database();

module.exports = {
  db,
  bucketName,
  admin,
};
