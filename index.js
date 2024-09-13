const express = require('express');
const { exec } = require('child_process');
const cors = require('cors'); // Import the cors package
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  sendContentToFirebase,
  uploadBufferToFirebase,
} = require('./send-to-firebase');
const { secondsToHHMMSS } = require('./utils/seconds-to-hhmmss');
const { isNumber } = require('./utils/isNumber');

const app = express();
const port = 4000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Set up multer for file upload handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to the public folder in the React app
    cb(null, path.join(__dirname, 'public', 'video'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const audioPath = path.join(__dirname, 'public', 'audio');
const videoPath = path.join(__dirname, 'public', 'video');
if (!fs.existsSync(audioPath)) {
  fs.mkdirSync(audioPath, { recursive: true });
}
if (!fs.existsSync(videoPath)) {
  fs.mkdirSync(videoPath, { recursive: true });
}

app.post('/send-to-content', async (req, res) => {
  const { firebaseContentTitle, trimStart, trimEnd, transcript } = req.body;
  // Check if all necessary parameters are provided
  if (
    !firebaseContentTitle ||
    !isNumber(trimStart) ||
    !isNumber(trimEnd) ||
    !transcript
  ) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const inAudioFolderTitle = firebaseContentTitle + '-' + trimStart;
  const formattedTitle =
    firebaseContentTitle +
    '-' +
    secondsToHHMMSS(trimStart) +
    '-' +
    secondsToHHMMSS(trimEnd);

  try {
    await uploadBufferToFirebase({
      inAudioTitle: inAudioFolderTitle,
      formattedTitle,
    });
    await sendContentToFirebase({ transcript, formattedTitle });
    res
      .status(200)
      .json({ message: 'Successfully updated entry', contentEntry });
  } catch (error) {
    res.status(500).json({ error });
  }
});

app.post('/audio-snippet', (req, res) => {
  const { contentName, trimStart, trimEnd } = req.body;

  // Check if all necessary parameters are provided
  if (!contentName || !isNumber(trimStart) || !isNumber(trimEnd)) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const outputFileName = `${contentName}-${trimStart}`;
  // Construct the FFmpeg command dynamically
  const outputFilePath = path.join(audioPath, `${outputFileName}.mp3`);
  const inputFilePath = path.join(audioPath, `${contentName}.mp3`);

  const ffmpegCommand = `ffmpeg -i ${inputFilePath} -ss ${trimStart} -to ${trimEnd} -c copy ${outputFilePath}`;
  // const ffmpegCommand = `ffmpeg -i ${contentName}.webm -ss ${trimStart} -to ${trimEnd} -vn -ar 44100 -ab 96k -ac 2 ${outputFilePath}`;

  // Execute the FFmpeg command
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing FFmpeg command: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }

    if (stderr) {
      console.error(`FFmpeg stderr: ${stderr}`);
    }

    // Send response with the URL to the saved file
    return res.json({
      message: 'Audio successfully extracted and trimmed',
      file: `/audio/${outputFileName}.mp3`, // URL to access the file
    });
  });
});

// POST endpoint to convert video to audio
app.post('/video-to-audio', (req, res) => {
  // Extract values from the request body
  const { contentName, trimStart, trimEnd } = req.body;

  // Check if all necessary parameters are provided
  if (!contentName || !trimStart || !trimEnd) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Construct the FFmpeg command dynamically
  const outputFilePath = path.join(audioPath, `${contentName}.mp3`);
  const inputFilePath = path.join(videoPath, `${contentName}.webm`);
  const ffmpegCommand = `ffmpeg -i ${inputFilePath} -ss ${trimStart} -to ${trimEnd} -vn -ar 44100 -ab 96k -ac 2 ${outputFilePath}`;
  // const ffmpegCommand = `ffmpeg -i ${contentName}.webm -ss ${trimStart} -to ${trimEnd} -vn -ar 44100 -ab 96k -ac 2 ${outputFilePath}`;

  // Execute the FFmpeg command
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing FFmpeg command: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }

    if (stderr) {
      console.error(`FFmpeg stderr: ${stderr}`);
    }

    // Send response with the URL to the saved file
    return res.json({
      message: 'Audio successfully extracted and trimmed',
      file: `/audio/${contentName}.mp3`, // URL to access the file
    });
  });
});

app.post('/upload-file', upload.single('file'), (req, res) => {
  console.log('## /upload-file 1', req.file);

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // File upload successful
  res.json({
    message: 'File uploaded successfully',
    filePath: `/audio/${req.file.filename}`,
  });
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
