
const express = require("express");
const router = express.Router();
const {
 
    listPayouts,
    getPayoutById,
    createPayout,
    updatePayout,
    batchCreatePayouts
} = require("../controllers/payout.controller");

router.get("/payouts", listPayouts);
router.get("/payouts/:id", getPayoutById);
router.post("/createpayouts", createPayout);
router.patch("/update/:id", updatePayout);
router.post("/payouts/batch", batchCreatePayouts);

module.exports = router;