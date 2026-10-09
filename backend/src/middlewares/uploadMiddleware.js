const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure upload folders exist
const uploadsDir = path.join(__dirname, '../../uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const coversDir = path.join(uploadsDir, 'covers');
const photosDir = path.join(uploadsDir, 'photos');
const destinationsDir = path.join(uploadsDir, 'destinations');

[uploadsDir, avatarsDir, coversDir, photosDir, destinationsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage destination dynamically
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'avatar') {
      cb(null, avatarsDir);
    } else if (file.fieldname === 'cover') {
      cb(null, coversDir);
    } else if (file.fieldname === 'destination' || file.fieldname === 'image') {
      cb(null, destinationsDir);
    } else {
      cb(null, photosDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = allowedTypes.test(file.mimetype);
  const extValid = allowedTypes.test(ext);

  if (mime && extValid) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed!'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

module.exports = upload;
