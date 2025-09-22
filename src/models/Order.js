const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productImage: String, // Snapshot of the main product image for display
  vendor: { // Reference to the User (vendor) who owns this product
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  vendorName: { // Snapshot of the vendor's company/full name
    type: String,
    required: true
  },
  variantId: { // The _id of the specific variant purchased from the Product's variants array
    type: mongoose.Schema.ObjectId,
    required: true
  },
  variantName: { // Snapshot of the variant's name (e.g., 'Basic Plan')
    type: String,
    required: true
  },
  variantDuration: String, // Snapshot of the variant's duration (e.g., 'Lifetime')
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  priceAtPurchase: { // The selling price of this variant at the time of purchase (per unit)
    type: Number,
    required: true,
    min: [0, 'Price at purchase cannot be negative']
  },
  totalPrice: { // quantity * priceAtPurchase for this item
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  }
}, { _id: false }); // No _id for this subdocument

const orderSchema = new mongoose.Schema({
  buyer: { // The user who placed the order
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Order must belong to a buyer']
  },
  orderItems: {
    type: [orderItemSchema],
    required: [true, 'Order must contain items'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  billingAddress: {
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], trim: true },
    phone: { type: String, required: [true, 'Phone is required'], trim: true }
  },
  subtotal: { // Sum of totalPrice for all orderItems
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  taxAmount: { // Calculated tax
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  discountAmount: { // Total discount applied to the entire order (e.g., from a coupon)
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  totalAmount: { // Final amount paid by the buyer
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['Paystack', 'Paypal', 'Flutterwave'], // From UI image
    required: [true, 'Payment method is required']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending' // Initial status
  },
  transactionId: String, // ID received from the payment gateway
  orderStatus: { // Overall status of the order lifecycle
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  couponApplied: String, // Code of the coupon applied, if any
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update `updatedAt` on every save
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;