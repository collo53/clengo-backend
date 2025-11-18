const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 


async function paymentRecord(req, res) {

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
}

module.exports={
    paymentRecord,
};
