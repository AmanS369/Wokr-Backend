
import multer from 'multer';
// Define the storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '../images'); 
  },
  filename: (req, file, cb) => {
    // Define how file names should be formatted
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

// Create an instance of multer with the storage configuration
const upload = multer({ storage });

export default upload;
