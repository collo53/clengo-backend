const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');


// Multer storage for job documents

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


// POST /jobs/create - create job

router.post('/create', upload.single('document'), async (req, res) => {
  try {
    const {
      jobID, customerID, assigned, jobType, startDate, startTime, endTime, duration,
      address, status, recurrence, relatedJobID, price, clengoFees, cleanerEarnings,
      paymentMethod, notes, frequency
    } = req.body;

    if (!customerID || !startDate) return res.status(400).json({ success: false, message: "customerID and startDate are required." });

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
      job: { id: result.insertId, jobID, customerID, assigned, jobType, startDate, startTime, endTime,
             duration, address, status, recurrence, relatedJobID, price, clengoFees,
             cleanerEarnings, paymentMethod, notes, frequency, documentUrl,updatedAT, createdAt }
    });
  } catch (err) {
    console.error("Error creating job:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});


// GET /jobs - list jobs with filters, pagination, sorting

router.get('/', async (req, res) => {
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
});

// -----------------------------
// GET /jobs/:id - get job details by ID
// -----------------------------
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const [rows] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error fetching job by ID:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// -----------------------------
// PATCH /jobs/:id - update job
// -----------------------------
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const data = req.body;

    const [existing] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Job not found' });

    const fields = [];
    const values = [];
    for (const key in data) if (data[key] !== undefined) fields.push(`${key} = ?`), values.push(data[key]);

    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    fields.push('updatedAt = NOW()');
    values.push(id);

    await pool.query(`UPDATE job SET ${fields.join(', ')} WHERE id = ?`, values);
    res.status(200).json({ success: true, data, message: 'Job updated successfully' });
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// -----------------------------
// DELETE /jobs/:id - cancel or delete job
// -----------------------------
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const { cancel, reason } = req.query;

    const [existing] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Job not found' });

    if (cancel === 'true') {
      await pool.query('UPDATE job SET status = ?, cancelReason = ?, updatedAt = NOW() WHERE id = ?', ['cancelled', reason || null, id]);
      return res.status(200).json({ success: true, data: { jobID: existing[0].jobID, status: 'cancelled' }, message: 'Job cancelled successfully' });
    }

    await pool.query('DELETE FROM job WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// -----------------------------
// POST /jobs/:id/assign - assign cleaner
// -----------------------------
router.post('/:id/assign', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const { cleanerId, makePrimary, note } = req.body;

    const [job] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!job.length) return res.status(404).json({ success: false, message: 'Job not found' });

    await pool.query('UPDATE job SET assigned = ?, updatedAt = NOW() WHERE id = ?', [cleanerId, id]);

    res.status(200).json({
      success: true,
      data: { jobId: id, status: job[0].status, assignedTo: { cleanerId, primary: !!makePrimary, note } },
      message: 'Cleaner assigned successfully'
    });
  } catch (err) {
    console.error('Error assigning cleaner:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// -----------------------------
// PATCH /jobs/:id/status - update job status
// -----------------------------
router.patch('/:id/status', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const { status, notes } = req.body;

    const [job] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!job.length) return res.status(404).json({ success: false, message: 'Job not found' });

    const previousStatus = job[0].status;
    await pool.query('UPDATE job SET status = ?, notes = ?, updatedAt = NOW() WHERE id = ?', [status, notes || null, id]);

    res.status(200).json({ success: true, data: { jobId: id, previousStatus, currentStatus: status }, message: 'Job status updated successfully' });
  } catch (err) {
    console.error('Error updating job status:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});


// POST /jobs/:id/reverse - reverse completed job

router.post('/:id/reverse', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const { reason, refundAmount } = req.body;

    const [job] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!job.length) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job[0].status !== 'completed') return res.status(400).json({ success: false, message: 'Only completed jobs can be reversed' });

    await pool.query('UPDATE job SET status = ?, refundAmount = ?, updatedAt = NOW() WHERE id = ?', ['cancelled', refundAmount, id]);

    res.status(200).json({ success: true, data: { jobId: id, previousStatus: 'completed', currentStatus: 'cancelled', refundIssued: true, refundAmount }, message: 'Job reversed successfully' });
  } catch (err) {
    console.error('Error reversing job:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// -----------------------------
// PUT /jobs/:id/payment - record payment
// -----------------------------
router.put('/:id/payment', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const { paymentStatus, paymentMethod, totalAmount, cleanerEarnings, clengoFees, transactionId, paidAt, notes } = req.body;

    const [job] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!job.length) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    await pool.query(
      `UPDATE job SET paymentStatus = ?, paymentMethod = ?, totalAmount = ?, cleanerEarnings = ?, clengoFees = ?, transactionId = ?, paidAt = ?, notes = ?, updatedAt = NOW() WHERE id = ?`,
      [paymentStatus, paymentMethod, totalAmount, cleanerEarnings, clengoFees, transactionId, paidAt, notes, id]
    );

    res.status(200).json({
      success: true,
      data: { jobId: id, paymentStatus, paymentMethod, totalAmount, notes },
      message: 'Payment recorded successfully'
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});


// -----------------------------
// PATCH /jobs/bulk - bulk update
// -----------------------------




// -----------------------------
// GET /jobs/:id/logs - get job logs
// -----------------------------
router.get('/:id/logs', async (req, res) => {
  try {
    const id = req.params.id.trim();
    const [logs] = await pool.query('SELECT * FROM job_logs WHERE jobId = ?', [id]);
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    console.error('Error fetching job logs:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
