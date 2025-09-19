// routes/productRoutes.js
const express = require('express');
const productController = require('../controllers/productControler');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware'); // For image uploads

const router = express.Router();

// Public routes for viewing products (anyone can see products)
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);

// Vendor-specific routes (require authentication and vendor role)
router.use(authMiddleware.protect); // All routes below this require a logged-in user

// Apply vendor restriction and KYC check for product creation/management
router.use(
  authMiddleware.restrictTo('vendor'),
  authMiddleware.ensureVendorKyc // Ensure vendor has completed KYC before listing products
);


router.post(
  '/',
  uploadMiddleware.uploadProductImages, // Multer middleware to process 'photos' field
  uploadMiddleware.processAndUploadProductImages, // Middleware to resize/upload to cloud
  productController.createProduct
);

router.patch(
  '/:id',
  uploadMiddleware.uploadProductImages, // Allows updating photos along with other details
  uploadMiddleware.processAndUploadProductImages,
  productController.updateProduct
);

router.delete('/:id', productController.deleteProduct);

// Dashboard and analytics routes (vendor specific)
router.get('/dashboard-summary', productController.getDashboardSummary);
router.get('/top-selling', productController.getTopSellingProducts);
router.get('/monthly-sellout', productController.getMonthlySelloutRate);


module.exports = router;