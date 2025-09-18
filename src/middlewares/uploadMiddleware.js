// middlewares/uploadMiddleware.js
const multer = require('multer');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Configure Multer storage
const multerStorage = multer.memoryStorage(); // Store image in buffer for processing (e.g., resizing, then uploading to cloud)
// For local storage, you would do:
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/products'); // Destination folder for uploaded images
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1]; // e.g., 'jpeg', 'png'
//     cb(null, `product-${req.user.id}-${Date.now()}.${ext}`); // filename format: product-userID-timestamp.ext
//   }
// });

// Configure Multer file filter (only allow images)
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

// Middleware for uploading multiple product images (up to a max count)
// The field name 'photos' corresponds to the 'Product Photos' section in your 'List a Product' UI
exports.uploadProductImages = upload.array('photos', 5); // Allow up to 5 photos

// Middleware for resizing and potentially uploading to cloud (placeholder)
exports.processAndUploadProductImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  // If using local disk storage, req.files would already contain paths.
  // If using memoryStorage, req.files will be buffers.
  // Here, you would implement image processing (e.g., sharp for resizing) and upload to a cloud service.

  req.body.photos = []; // Array to store the URLs of the uploaded images

  await Promise.all(
    req.files.map(async (file, i) => {
      // --- Placeholder for Image Processing and Cloud Upload ---
      // For example, using Cloudinary:
      // const result = await cloudinary.uploader.upload(file.buffer, {
      //   folder: 'widernetfarms/products',
      //   public_id: `product-${req.user.id}-${Date.now()}-${i}`,
      //   transformation: [{ width: 800, height: 600, crop: 'limit' }]
      // });
      // req.body.photos.push(result.secure_url);

      // For now, if just using memoryStorage, you might save locally (temporarily) or just skip for this example
      // In a real app with memoryStorage, you MUST upload to a permanent storage.
      // For demonstration purposes, we'll simulate a URL:
      const ext = file.mimetype.split('/')[1];
      const simulatedUrl = `https://cdn.example.com/products/product-${req.user.id}-${Date.now()}-${i}.${ext}`;
      req.body.photos.push(simulatedUrl);
      // -----------------------------------------------------------
    })
  );

  next();
});