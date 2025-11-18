
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/jobs/');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });


async function getJob(req, res) {

  try {
    const {
      status, assignedTo, customerId, startDate, endDate, jobType,
      priority, paymentStatus, page = 1, limit = 20, sortBy = 'startDate', order = 'asc'
    } = req.query;

    const filters = [];
    const values = [];

    if (status) filters.push('status = ?'), values.push(status);
    if (assignedTo) filters.push('assigned = ?'), values.push(assignedTo);
    if (customerId) filters.push('customerID = ?'), values.push(customerId);
    if (startDate) filters.push('startDate >= ?'), values.push(startDate);
    if (endDate) filters.push('endDate <= ?'), values.push(endDate);
    if (jobType) filters.push('jobType = ?'), values.push(jobType);
    if (priority) filters.push('priority = ?'), values.push(priority);
    if (paymentStatus) filters.push('paymentStatus = ?'), values.push(paymentStatus);

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [jobs] = await pool.query(
      `SELECT * FROM job ${whereClause} ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`,
      [...values, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM job ${whereClause}`, values);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1
      }
    });
  } catch (err) {
    console.error('Error listing jobs:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

module.exports={
    getJob,
};
