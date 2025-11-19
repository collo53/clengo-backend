const express = require("express");
const router = express.Router();
const { pool } = require("../config/db"); 
const { get } = require("./users");
const { 
    registerCustomer,
    getCustomer,
    getCustomerbyId,
    deleteCustomer

 } = require('../controllers/customers.controller');





router.post('/register', registerCustomer);
router.get('/getcustomers', getCustomer);
router.get('/:id', getCustomerbyId);
router.delete("/delete/:id",deleteCustomer);










module.exports = router;
