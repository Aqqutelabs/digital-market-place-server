// app.js (or server.js, your main application file)
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const AppError = require('./src/utils/appError')
const globalErrorHandler = require('./src/middlewares/errorMiddleware');

// Import your routes
const authRouter = require('./src/routes/authRoutes');
const userRouter = require('./src/routes/userRoutes');
const productRouter = require('./src/routes/productRoutes');

const app = express();

// 1. CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// 2. Security HTTP Headers
// app.use(helmet());

// 3. Development logging
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

// 4. Rate Limiting
const limiter = rateLimit({
  max: 1000, // Adjust as needed
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!'
});
// app.use('/api', limiter);

// 5. Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// app.use(cookieParser());

// 6. Data sanitization against NoSQL query injection
// app.use(mongoSanitize());

// 7. Data sanitization against XSS
// app.use(xss());

// 8. Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'duration', 'averageRating', 'basePrice', 'discount',
    'totalSold', 'category', 'type', 'name' // Added 'name' for potential filtering/sorting
  ]
}));

// 9. Serving static files (if you have any locally stored images)
// app.use(express.static(`${__dirname}/public`));

// 10. ROUTES
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/products', productRouter);


// 11. Handle unhandled routes (404 Not Found)


// 12. Global Error Handling Middleware (MUST be the last middleware)
// app.use(globalErrorHandler);

module.exports = app;





