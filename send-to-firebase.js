const { admin, db } = require('./db-init');
const path = require('path');
const fs = require('fs');

const ref = 'japaneseContent';
const sendContentToFirebase = async ({ formattedTitle, transcript }) => {
  console.log('## sendContentToFirebase 1', { formattedTitle });
  try {
    console.log('## sendContentToFirebase 2');
    // Fetch the existing array
    const snapshot = await db.ref(ref).once('value');
    console.log('## sendContentToFirebase 3');
    let newArray = snapshot.val() || [];

    // Check if the new item's ID already exists in the array
    console.log('## sendContentToFirebase 3');
    const entryTitle = formattedTitle;
    const isDuplicate = newArray.some((item) => item.title === entryTitle);

    console.log('## sendContentToFirebase 4');
    if (!isDuplicate) {
      // Add the new item to the array
      const contentEntry = {
        title: formattedTitle,
        content: transcript,
        hasAudio: true, // should be after,
        origin: 'netflix',
      };
      newArray.push(contentEntry);
      console.log('## sendContentToFirebase 5');

      // Update the entire array
      await db.ref(ref).set(newArray);
    } else {
      console.log('## Item already exists in DB');
    }
  } catch (error) {
    console.error('## Error updating database structure:', error);
    return error;
  }
};

// extract-youtube-audio
const uploadBufferToFirebase = async ({ inAudioTitle, formattedTitle }) => {
  console.log('## 1 uploadBufferToFirebase', { inAudioTitle, formattedTitle });

  const metadata = {
    contentType: 'audio/mpeg',
  };
  // console.log('## 2', admin);

  const storage = admin.storage();

  const fileNameWithMP3Ending = inAudioTitle + '.mp3';
  console.log('## 2 uploadBufferToFirebase');

  const audioPath = path.join(
    __dirname,
    'public',
    'audio',
    fileNameWithMP3Ending,
  );
  console.log('## 3 uploadBufferToFirebase', { audioPath });

  const fileBuffer = fs.readFileSync(audioPath);
  console.log('## 4 uploadBufferToFirebase');

  const bucketName = process.env.FIREBASE_BUCKET_NAME;

  const filePath = 'japanese-audio/' + formattedTitle + '.mp3';

  try {
    console.log('## 5 uploadBufferToFirebase');
    await storage.bucket(bucketName).file(filePath).save(fileBuffer, {
      metadata: metadata,
    });
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    console.log('## 6 uploadBufferToFirebase');
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });
    return url;
  } catch (error) {
    console.error('## Error uploading file to firebase:', error);
  }
};

module.exports = { sendContentToFirebase, uploadBufferToFirebase };
