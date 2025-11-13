const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const { connectDB } = require('./config/db');

// Import routes
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const app = express();

// ======================================
// ✅ Connect to MySQL
// ======================================
connectDB();

// ======================================
// ✅ Middleware setup
// ======================================
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors()); 


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/v1',customersRouter);


app.use((req, res, next) => {
  next(createError(404));
});


app.use((err, req, res, next) => {
  const status = err.status || 500;

  // Return JSON error response for API clients
  res.status(status).json({
    success: false,
    message: err.message || 'Server error',
    stack: req.app.get('env') === 'development' ? err.stack : {},
  });
});

module.exports = app;
