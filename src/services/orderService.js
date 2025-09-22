// services/orderService.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/appError');
const paymentGateway = require('../utils/paymentGateway');
const email = require('../utils/email');
const mongoose = require('mongoose');
const Coupon = require('../models/Coupons');
const User = require('../models/User');
const paystackService = require('../utils/paystackService');


const calculateOrderTotals = async (cartItems, requestedCouponCode = null, userId) => {
  let subtotal = 0;
  const orderItems = [];

  for (const item of cartItems) {
    if (!item.productId || !item.variantId || !item.quantity) {
      throw new AppError('Each cart item must have productId, variantId, and quantity.', 400);
    }
    if (item.quantity <= 0) {
      throw new AppError(`Quantity for product ${item.productId} must be at least 1.`, 400);
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      throw new AppError(`Product with ID ${item.productId} not found.`, 404);
    }

    const variant = product.variants.id(item.variantId);
    if (!variant) {
      throw new AppError(`Variant with ID ${item.variantId} not found for product "${product.name}".`, 404);
    }

    const vendor = await User.findById(product.vendor).select('companyName fullName');
    if (!vendor) {
      throw new AppError(`Vendor for product "${product.name}" not found.`, 404);
    }

    const priceAtPurchase = variant.sellingPrice;
    const totalPriceForItem = priceAtPurchase * item.quantity;
    subtotal += totalPriceForItem;

    orderItems.push({
      product: product._id,
      productName: product.name,
      productImage: product.photos && product.photos.length > 0 ? product.photos[0] : null,
      vendor: product.vendor,
      vendorName: vendor.companyName || vendor.fullName,
      variantId: variant._id,
      variantName: variant.variantName,
      variantDuration: variant.duration,
      quantity: item.quantity,
      priceAtPurchase: priceAtPurchase,
      totalPrice: totalPriceForItem,
    });
  }

  // --- Coupon Logic ---
  let discountAmount = 0;
  let appliedCoupon = null;
  let couponValidationError = null;

  if (requestedCouponCode) {
    const coupon = await Coupon.findOne({ code: requestedCouponCode });

    if (!coupon) {
      couponValidationError = 'Invalid coupon code.';
    } else {
      const validationResult = coupon.isValid(subtotal, userId); // Use the isValid method
      if (!validationResult.valid) {
        couponValidationError = validationResult.message;
      } else {
        appliedCoupon = coupon;
        if (coupon.type === 'percentage') {
          discountAmount = subtotal * (coupon.value / 100);
        } else if (coupon.type === 'fixed') {
          discountAmount = coupon.value;
        }
        // Ensure discount doesn't make total negative
        if (discountAmount > subtotal) {
          discountAmount = subtotal;
        }
      }
    }
    if (couponValidationError) {
        // You might want to throw an error here or just return the error message
        // For now, we'll let it proceed but note the error for response if needed
        console.warn(`Coupon application failed: ${couponValidationError}`);
        // throw new AppError(couponValidationError, 400); // Uncomment to halt order if coupon is invalid
    }
  }

  // --- Tax Calculation (Mock) ---
  const taxRate = 0.05; // Example: 5% tax
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount > 0 ? taxableAmount * taxRate : 0;

  const totalAmount = taxableAmount + taxAmount;

  return { subtotal, discountAmount, taxAmount, totalAmount, orderItems, appliedCoupon, couponValidationError };
};

exports.createOrder = async (userId, { cartItems, billingAddress, paymentMethod, couponCode }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate cart items and calculate all totals (subtotal, discount, tax, total)
    const { subtotal, discountAmount, taxAmount, totalAmount, orderItems, appliedCoupon, couponValidationError } = await calculateOrderTotals(
      cartItems,
      couponCode,
      userId // Pass userId for specific coupon validation
    );

    // If coupon validation failed, you might want to throw an error
    if (couponValidationError && couponCode) {
        throw new AppError(`Coupon "${couponCode}" could not be applied: ${couponValidationError}`, 400);
    }

    // 2. Create the Order document in the database with paymentStatus: 'pending'
    const newOrder = await Order.create([{
      buyer: userId,
      orderItems,
      billingAddress,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paymentMethod,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      couponApplied: appliedCoupon ? appliedCoupon.code : null
    }], { session });

    // 3. Create Paystack payment session
    const paymentSession = await paystackService.createPaymentSession({
      amount: totalAmount,
      email: billingAddress.email,
      orderId: newOrder[0]._id,
      metadata: { userId }
    });

    // 4. Generate and save a new unique coupon for the user who just made the purchase
    const generatedCouponCode = Math.random().toString(36).substring(2, 10).toUpperCase(); // 8 random chars
    const newCoupon = await Coupon.create({
      code: `ORDER-${generatedCouponCode}`,
      type: 'percentage', // Example: 15% off
      value: 15,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
      minOrderAmount: 1000, // Example: NGN 1000 minimum order
      maxUses: 1, // Single use
      forSpecificUser: true,
      userWhoCanUse: userId, // Only this user can use it
      isActive: true
    });

    await session.commitTransaction();
    session.endSession();

    // Send the newly generated coupon email (non-blocking, after transaction)
    email.sendCouponEmail(
      billingAddress.email,
      newCoupon.code,
      newCoupon.value,
      newCoupon.type,
      newCoupon.expiresAt,
      {
        orderId: newOrder[0]._id,
        productNames: orderItems.map(item => item.productName).join(', '),
        totalAmount: totalAmount
      }
    ).catch(err => {
      console.error('Error sending generated coupon email:', err);
    });

    // Return the payment session info (including Paystack payment URL/reference) and the new coupon
    return { status: 'pending', data: { order: newOrder[0], payment: paymentSession, newCoupon: newCoupon.code } };
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      // Ignore abort errors (e.g., already committed)
    }
    session.endSession();
    throw err; // Re-throw the error to be caught by catchAsync middleware
  }
};

exports.getOrders = async (userId) => {
  const orders = await Order.find({ buyer: userId })
    .populate({
      path: 'orderItems.product', // Populate the product details for each item
      select: 'name photos' // Select relevant fields
    })
    .sort('-createdAt'); // Sort by most recent first
  return { status: 'success', results: orders.length, data: { orders } };
};

exports.getOrderById = async (orderId, userId) => {
  const order = await Order.findOne({ _id: orderId, buyer: userId })
    .populate({
      path: 'orderItems.product',
      select: 'name photos'
    });

  if (!order) {
    throw new AppError('No order found with that ID for this user.', 404);
  }
  return { status: 'success', data: { order } };
};