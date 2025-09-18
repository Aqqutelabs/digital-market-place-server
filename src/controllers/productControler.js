// controllers/productController.js
const productService = require('../services/productService');
const catchAsync = require('../utils/catchAsync');

exports.createProduct = catchAsync(async (req, res, next) => {
  // req.body should already contain product details + 'photos' array if images were uploaded
  // by uploadMiddleware.processAndUploadProductImages
  const result = await productService.createProduct(req.user.id, req.body);
  res.status(201).json(result); // 201 Created
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
  // Check if a user is logged in and if they are a vendor to filter their products
  const userId = req.user ? req.user.id : null;
  const userRole = req.user ? req.user.userRole : null;

  const result = await productService.getAllProducts(req.query, userId, userRole);
  res.status(200).json(result);
});

exports.getProduct = catchAsync(async (req, res, next) => {
  const productId = req.params.id;
  // If a user is logged in and is a vendor, we pass their ID to ensure they can only view their own products
  const userId = req.user ? req.user.id : null;
  const userRole = req.user ? req.user.userRole : null;

  const result = await productService.getProductById(productId, userId, userRole);
  res.status(200).json(result);
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const productId = req.params.id;
  // req.body might contain new product details and potentially new photo URLs
  const result = await productService.updateProduct(req.user.id, productId, req.body);
  res.status(200).json(result);
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const productId = req.params.id;
  await productService.deleteProduct(productId, req.user.id);
  // Send 204 No Content for successful deletion
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getDashboardSummary = catchAsync(async (req, res, next) => {
  // Assumes req.user is populated by protect middleware
  const result = await productService.getDashboardSummary(req.user.id);
  res.status(200).json(result);
});

exports.getTopSellingProducts = catchAsync(async (req, res, next) => {
  // Assumes req.user is populated by protect middleware
  // Optional: Allow client to specify limit via query param like ?limit=10
  const limit = parseInt(req.query.limit, 10) || 5;
  const result = await productService.getTopSellingProducts(req.user.id, limit);
  res.status(200).json(result);
});

exports.getMonthlySelloutRate = catchAsync(async (req, res, next) => {
  // Assumes req.user is populated by protect middleware
  // Optional: Allow client to specify year via query param like ?year=2023
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const result = await productService.getMonthlySelloutRate(req.user.id, year);
  res.status(200).json(result);
});