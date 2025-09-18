// services/productService.js
const Product = require('../models/Product');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.createProduct = async (userId, productData) => {
  // Ensure the vendor field is correctly set to the current user's ID
  const newProductData = {
    ...productData,
    vendor: userId
  };

  const newProduct = await Product.create(newProductData);

  return { status: 'success', data: { product: newProduct } };
};

exports.getAllProducts = async (queryString, userId = null, role = null) => {
  let query = Product.find();

  // If a vendor is requesting their own products, filter by vendor ID
  if (userId && role === 'vendor') {
    query = query.find({ vendor: userId });
  }

  // Apply APIFeatures for filtering, sorting, limiting fields, and pagination
  const features = new APIFeatures(query, queryString)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  // For total count without pagination, useful for frontend pagination controls
  const totalCountQuery = Product.find();
  if (userId && role === 'vendor') {
    totalCountQuery.find({ vendor: userId });
  }
  const totalCountFeatures = new APIFeatures(totalCountQuery, queryString).filter();
  const totalProducts = await totalCountFeatures.query.countDocuments();


  return {
    status: 'success',
    results: products.length,
    totalProducts, // Total count of items matching filters
    data: { products }
  };
};

exports.getProductById = async (productId, userId = null, role = null) => {
  let query = Product.findById(productId);

  // If a vendor is requesting their own product, ensure they own it
  if (userId && role === 'vendor') {
    query = query.where('vendor').equals(userId);
  }

  const product = await query.populate('vendor', 'companyName fullName email'); // Populate vendor info
  // 'companyName fullName email' limits the fields retrieved from the User model.

  if (!product) {
    throw new AppError('No product found with that ID', 404);
  }

  return { status: 'success', data: { product } };
};

exports.updateProduct = async (productId, userId, updateData) => {
  // Ensure only the owner can update their product
  const product = await Product.findOneAndUpdate(
    { _id: productId, vendor: userId }, // Find by ID and vendor
    updateData,
    {
      new: true, // Return the updated document
      runValidators: true // Run schema validators on update
    }
  );

  if (!product) {
    throw new AppError('No product found with that ID for this vendor', 404);
  }

  return { status: 'success', data: { product } };
};

exports.deleteProduct = async (productId, userId) => {
  const product = await Product.findOneAndDelete({ _id: productId, vendor: userId });

  if (!product) {
    throw new AppError('No product found with that ID for this vendor', 404);
  }

  return { status: 'success', message: 'Product deleted successfully.' };
};

exports.getDashboardSummary = async (userId) => {
  // Aggregation pipeline to get dashboard metrics
  const stats = await Product.aggregate([
    {
      $match: { vendor: userId } // Only consider products for the current vendor
    },
    {
      $group: {
        _id: null, // Group all documents into a single group for overall stats
        totalSales: { $sum: { $multiply: ['$totalSold', { $avg: '$variants.sellingPrice' }] } }, // Estimate total sales
        productsSold: { $sum: '$totalSold' },
        productsListed: { $sum: 1 } // Count all products
      }
    },
    {
      $addFields: {
        walletBalance: { $multiply: ['$totalSales', 0.9] } // Simulate a 10% platform fee, for example
      }
    },
    {
      $project: {
        _id: 0, // Exclude _id
        totalSales: 1,
        productsSold: 1,
        productsListed: 1,
        walletBalance: 1
      }
    }
  ]);

  // Handle case where no products exist for the vendor
  if (stats.length === 0) {
    return {
      status: 'success',
      data: {
        summary: {
          totalSales: 0,
          productsSold: 0,
          productsListed: 0,
          walletBalance: 0
        }
      }
    };
  }

  return { status: 'success', data: { summary: stats[0] } };
};

exports.getTopSellingProducts = async (userId, limit = 5) => {
  const topProducts = await Product.find({ vendor: userId })
    .sort('-totalSold') // Sort in descending order of totalSold
    .limit(limit)
    .select('name totalSold') // Select only necessary fields
    .lean(); // Use .lean() for faster queries if you don't need Mongoose document methods

  return { status: 'success', data: { products: topProducts } };
};

exports.getMonthlySelloutRate = async (userId, year = new Date().getFullYear()) => {
  // This aggregation assumes 'totalSold' on product is updated over time,
  // or it needs to join with an 'Order' collection if you track actual sales per month.
  // For now, let's simplify and show products by how often they've been 'sold' recently.
  // A true sell-out rate would require monthly sales data.

  const pipeline = [
    {
      $match: { vendor: userId, createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } }
    },
    {
      $group: {
        _id: { $month: '$createdAt' }, // Group by month product was listed
        productCount: { $sum: 1 },
        totalSales: { $sum: '$totalSold' },
        products: { $push: { name: '$name', totalSold: '$totalSold' } } // Push product details
      }
    },
    {
      $sort: { _id: 1 } // Sort by month
    },
    {
      $project: {
        _id: 0,
        month: '$_id',
        productCount: 1,
        totalSales: 1,
        products: 1
      }
    }
  ];

  const monthlyStats = await Product.aggregate(pipeline);

  // Format to match UI if needed (e.g., specific products, popularity)
  // The UI shows "Name", "Popularity", "Sales" per product for the month.
  // This would typically come from an 'Order' model where sales are recorded monthly.
  // For current setup, we can adapt.
  const formattedStats = monthlyStats.map(stat => {
    // This is a simplified representation. A true "sell-out rate" per product per month
    // would require tracking individual sales over time.
    // For the UI's "Monthly Sell-out Rate" table, it likely expects a list of top performers
    // (by sales) within a recent period, or an aggregate like "products sold this month".
    // Here, we'll provide a list of top selling products within the monthly context,
    // which may require further aggregation on the client side or a different pipeline.
    // For now, let's provide a list of products that were listed in that month and their total sales.

    const topProductsForMonth = stat.products
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5) // Top 5 products listed/sold that month
      .map((p, index) => ({
        rank: index + 1,
        name: p.name,
        sales: p.totalSold, // This is total sales, not monthly sales. Needs Order model for monthly.
        popularity: (p.totalSold / stat.totalSales * 100).toFixed(1) + '%' // Simplified popularity
      }));

    return {
      month: stat.month,
      overallMonthlySales: stat.totalSales,
      topProducts: topProductsForMonth
    };
  });

  // Since the UI directly shows "Farm App", "Farmer's Guide", "Tractor" with direct sales numbers,
  // this data suggests hardcoded or very specific aggregated data per product, likely
  // coming from a true sales/order history.
  // For this model, we would present products sorted by totalSold, and you can pick the top ones.
  const productsByPopularity = await Product.find({ vendor: userId })
    .sort('-totalSold')
    .select('name totalSold')
    .limit(4) // As seen in the UI example (Farm App, Farmer's Guide, Tractor, Tractor App)
    .lean();

  const mockMonthlySelloutData = productsByPopularity.map((p, index) => ({
    rank: index + 1,
    name: p.name,
    popularity: `${(p.totalSold / (productsByPopularity[0]?.totalSold || 1) * 100).toFixed(0)}%`, // Relative popularity
    sales: p.totalSold // This is still total, not monthly. Requires orders.
  }));


  return { status: 'success', data: {
      monthlyOverview: formattedStats,
      monthlySelloutRateDisplay: mockMonthlySelloutData // This directly mimics the UI's monthly display
    }
  };
};