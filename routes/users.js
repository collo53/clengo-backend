const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { create } = require('domain');
const jwt = require('jsonwebtoken');
const JWT_SECRET="bc78717fa8f545e181b03ec042938d5b0497478b2eccd33c39db57c15d94e302";
const JWT_EXPIRES_IN="30d";
const {
  loginAdmin,
  registerUser,
  getAllUsers,
  getUserbyId,
  updateUser,
  deleteUser
} = require('../controllers/users.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });



router.post('/register', registerUser);

router.post('/login', loginAdmin);

router.get('/getusers', getAllUsers);

router.get('/:id', getUserbyId);

router.put("/update/:id", upload.single("profilePic"), updateUser);

router.delete('/delete/:id', deleteUser);





module.exports = router;
