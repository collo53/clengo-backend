const express = require("express");
const router = express.Router();
const { pool } = require("../config/db"); 
const { get } = require("./users");
const { registerCustomer } = require('../controllers/customer.registration');
const { getCustomer } = require('../controllers/customer.all');
const { getCustomerbyId } = require('../controllers/customer.byid');
const { deleteCustomer } = require('../controllers/delete.customer');





router.post('/register', registerCustomer);
router.get('/getcustomers', getCustomer);
router.get('/:id', getCustomerbyId);
router.delete("/delete/:id",deleteCustomer);










module.exports = router;
