const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  getJob,
  createJob,
  getJobbyId,
  assignCleaner,
  deleteJob,
  paymentRecord,
  reverseJob,
  updateJobStatus,
  updateJob

 } = require('../controllers/jobs.controller');

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



router.post('/create',createJob);
router.get('/getjob', getJob);
router.get('/:id', getJobbyId);
router.patch('/:id', updateJob);
router.delete("/delete/:id",deleteJob);
router.post("/:id/assign",assignCleaner);
router.patch("/:id/status",updateJobStatus);
router.post("/:id/reverse",reverseJob);
router.put("/:id/payment",paymentRecord);

module.exports = router;
