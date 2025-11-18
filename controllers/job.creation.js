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


async function createJob(req, res) {
  try {
    const {
      jobID, customerID, assigned, jobType, startDate, startTime, endTime, duration,
      address, status, recurrence, relatedJobID, price, clengoFees, cleanerEarnings,
      paymentMethod, notes, frequency
    } = req.body;

    if (!customerID || !startDate) {
      return res.status(400).json({ success: false, message: "customerID and startDate are required." });
    }

    const documentUrl = req.file ? `/uploads/jobs/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO job
      (id, jobID, customerID, assigned, jobType, startDate, startTime, endTime, duration, address,
       status, recurrence, relatedJobID, price, clengoFees, cleanerEarnings, paymentMethod, notes,
       frequency, documentUrl, createdAt, updatedAt)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [
        jobID || null, customerID, assigned || null, jobType || null, startDate,
        startTime || null, endTime || null, duration || null, address || null,
        status || null, recurrence || null, relatedJobID || null, price || 0,
        clengoFees || 0, cleanerEarnings || 0, paymentMethod || null,
        notes || null, frequency || null, documentUrl
      ]
    );

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job: {
        id: result.insertId,
        jobID, customerID, assigned, jobType, startDate, startTime, endTime,
        duration, address, status, recurrence, relatedJobID, price, clengoFees,
        cleanerEarnings, paymentMethod, notes, frequency, documentUrl
      }
    });

  } catch (err) {
    console.error("Error creating job:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
}

module.exports ={
    createJob,
};