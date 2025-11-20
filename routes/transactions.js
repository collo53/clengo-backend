const express = require("express");
const router = express.Router();
const {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  allocatePayment
} = require("../controllers/transaction.controller");


router.get("/getTransactions",  getAllTransactions);
router.get("/:id", getTransactionById);
router.post("/create", createTransaction);
router.patch("/update/:id", updateTransaction);
router.delete("/delete/:id", deleteTransaction);
router.post("/allocate", allocatePayment);

module.exports = router;
