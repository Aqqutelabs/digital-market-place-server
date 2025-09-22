const mongoose = require('mongoose');

// --- Sub-Schema for Product Variants ---
// This allows embedding multiple variants within a single product document.
const variantSchema = new mongoose.Schema({
  variantName: {
    type: String,
    required: [true, 'Variant name is required'],
    trim: true,
    maxlength: [50, 'Variant name cannot exceed 50 characters']
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Base price cannot be negative']
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0
  },
  sellingPrice: { // Stored calculated selling price for easier querying and display
    type: Number,
    min: [0, 'Selling price cannot be negative']
  },
  duration: { // Useful for subscription-based products (e.g., 'Lifetime', 'Monthly')
    type: String,
    enum: ['Lifetime', 'Monthly', 'Annually', 'One-time', null], // Expanded options
    default: 'One-time' // Default to one-time purchase if no specific duration
  },
  description: { // Description specific to this particular variant
    type: String,
    trim: true,
    maxlength: [500, 'Variant description cannot exceed 500 characters']
  }
}); // Removed { _id: false } to allow Mongoose to generate _id for each variant

// Pre-save hook for each variant to calculate sellingPrice
variantSchema.pre('save', function(next) {
  // Ensure selling price is calculated only if basePrice is available
  if (this.basePrice !== undefined) {
    this.sellingPrice = this.basePrice * (1 - (this.discount || 0) / 100);
  } else {
    this.sellingPrice = 0; // Default or handle as an error if basePrice is critical
  }
  next();
});

// --- Main Product Schema ---
const productSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.ObjectId, // Reference to the User (vendor) who owns this product
    ref: 'User',
    required: [true, 'Product must belong to a vendor']
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  subCategory: {
    type: String,
    trim: true,
    default: null,
    maxlength: [50, 'Sub-category cannot exceed 50 characters']
  },
  type: { // e.g., Hardware, Software, Digital Product, as seen in filters
    type: String,
    required: [true, 'Product type is required'],
    enum: ['Hardware', 'Software', 'Digital Product', 'Service', 'Other'], // Comprehensive list
    trim: true
  },
  generalDescription: { // General description of the product, separate from variant descriptions
    type: String,
    trim: true,
    maxlength: [2000, 'General product description cannot exceed 2000 characters']
  },
  photos: [{ // Array of URLs to product images (will be stored externally, e.g., Cloudinary, S3)
    type: String,
    trim: true
  }],
  variants: {
    type: [variantSchema], // Embed the variant sub-schema
    required: [true, 'At least one product variant is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0; // Ensure at least one variant is provided
      },
      message: 'Product must have at least one variant'
    }
  },
  totalSold: { // Aggregate field for sales metrics on dashboard
    type: Number,
    default: 0,
    min: [0, 'Total sold cannot be negative']
  },
  averageRating: { // Aggregate field derived from reviews
    type: Number,
    default: 0,
    min: [0, 'Average rating cannot be negative'],
    max: [5, 'Average rating cannot exceed 5'],
    set: val => Math.round(val * 10) / 10 // Rounds to 1 decimal place
  },
  reviewCount: { // Aggregate field derived from reviews
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  },
  isListed: { // Allows vendors to list/unlist a product from public view
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true }, // Enable virtuals when converting to JSON
  toObject: { virtuals: true } // Enable virtuals when converting to Object
});

// --- Schema Hooks & Indexes ---

// Create indexes for frequently queried fields to optimize read performance
productSchema.index({ vendor: 1 }); // Querying products by vendor
productSchema.index({ category: 1, subCategory: 1 }); // Querying by category/sub-category
productSchema.index({ type: 1 }); // Querying by product type (e.g., Hardware)
productSchema.index({ name: 'text' }); // For full-text search on product names

// Pre-save hook to ensure `sellingPrice` is calculated for all variants before saving
productSchema.pre('save', function(next) {
  // Check if the 'variants' array itself or any of its sub-documents have been modified
  if (this.isModified('variants') || this.isNew) {
    this.variants.forEach(variant => {
      // Manually trigger the variantSchema's pre-save hook
      // or re-calculate directly if variantSchema.pre('save') is not automatically called for sub-documents
      if (variant.basePrice !== undefined) {
        variant.sellingPrice = variant.basePrice * (1 - (variant.discount || 0) / 100);
      } else {
        variant.sellingPrice = 0;
      }
    });
  }
  this.updatedAt = Date.now(); // Update timestamp on every save
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;