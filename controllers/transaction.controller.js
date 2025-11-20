const { pool } = require("../config/db");
const uuid = require("uuid").v4;


async function getAllTransactions(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT 
          id,
          transactionType,
          transactionMode,
          relatedUser,
          relatedCustomer,
          relatedJob,
          amount,
          cleanerAmount,
          clengoAmount,
          paymentMethod,
          notes,
          reversedTransaction,
          createdAt
       FROM transaction`
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      transactions: rows,   // 👈 Same style as users: rows
    });
  } catch (err) {
    console.error("❌ Error fetching transactions:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: err.message,
    });
  }
}



async function getTransactionById(req, res) {
  try {
    const id = req.params.id.trim();

    const [rows] = await pool.query(`
      SELECT 
        t.id,
        t.transactionType AS type,
        t.transactionMode AS mode,
        t.amount,
        t.cleanerAmount,
        t.clengoAmount,
        t.paymentMethod,
        t.notes,
        t.relatedUser AS userId,
        t.relatedCustomer AS customerId,
        t.relatedJob AS jobId,
        t.reversedTransaction AS reversedTransactionId,
        t.createdAt,
        c.firstName AS customerFirstName,
        c.surname AS customerSurname,
        c.email AS customerEmail,
        j.jobType,
        j.startDate AS jobStartDate
      FROM transaction t
      LEFT JOIN customer c ON t.relatedCustomer = c.id
      LEFT JOIN job j ON t.relatedJob = j.id
      WHERE t.id = ?
      LIMIT 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const t = rows[0];

    res.status(200).json({
      success: true,
      transaction: {
        ...t,
        customer: t.customerId ? {
          id: t.customerId,
          name: t.customerFirstName ? `${t.customerFirstName} ${t.customerSurname}` : null,
          email: t.customerEmail
        } : null,
        job: t.jobId ? {
          jobId: t.jobId,
          startDate: t.jobStartDate,
          jobType: t.jobType
        } : null
      }
    });

  } catch (err) {
    console.error("❌ Error fetching transaction by ID:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching transaction",
      error: err.message,
    });
  }
}


async function createTransaction(req, res) {
  try {
    const {
      type,
      amount,
      customerId,
      jobId,
      userId,
      paymentMethod,
      description,
      transactionDate,
    } = req.body;

    const id = uuid();

    await pool.query(`
      INSERT INTO transaction 
      (id, transactionType, amount, relatedCustomer, relatedJob, relatedUser,
       paymentMethod, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, type, amount, customerId, jobId, userId || null,
      paymentMethod, description || null, transactionDate || new Date()
    ]);

    return res.status(201).json({
      success: true,
      data: {
        id,
        type,
        amount,
        customerId,
        jobId,
        status: "completed",
      },
      message: "Transaction created successfully"
    });

  } catch (err) {
    console.error("Create transaction error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

async function updateTransaction(req, res) {
  try {
    const id = req.params.id.trim();
    console.log("Updating transaction with ID:", id);

    // Combine body + query data (same as your update user function)
    const data = { ...req.body, ...req.query };

    // List allowed fields for update
    const allowedFields = [
      "transactionType",
      "transactionMode",
      "relatedUser",
      "relatedCustomer",
      "relatedJob",
      "amount",
      "cleanerAmount",
      "clengoAmount",
      "paymentMethod",
      "notes",
      "reversedTransaction"
    ];

    // Pick only fields that are in allowedFields and provided by the user
    const fieldsToUpdate = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined && data[key] !== "") {
        fieldsToUpdate[key] = data[key];
      }
    }

    // No valid fields provided
    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // Build dynamic SQL query
    const setClause = Object.keys(fieldsToUpdate)
      .map((field) => `${field} = ?`)
      .join(", ");

    const values = Object.values(fieldsToUpdate);

    const sql = `
      UPDATE transaction 
      SET ${setClause} 
      WHERE id = ?
    `;

    const [result] = await pool.query(sql, [...values, id]);

    // If no rows updated
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      updatedFields: fieldsToUpdate,
    });
  } catch (err) {
    console.error("❌ Error updating transaction:", err);
    res.status(500).json({
      success: false,
      message: "Error updating transaction",
      error: err.message,
    });
  }
}

async function deleteTransaction(req, res) {

  try {
    const id = req.params.id;

    await pool.query("DELETE FROM transaction WHERE id = ?", [id]);

    return res.json({ success: true, message: "Transaction deleted successfully" });

  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

async function allocatePayment(req, res) {
  const connection = await pool.getConnection();

  try {
    const { customerId, amount, paymentMethod, jobIds, allocationStrategy } = req.body;

    if (!customerId || !amount || !paymentMethod || !jobIds?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    let remaining = Number(amount);
    let allocations = [];
    let transactionIds = [];

    // Determine allocation ordering
    const orderedJobs =
      allocationStrategy === "oldest_first" ? jobIds : [...jobIds].reverse();

    // ---------------------------------------------------------
    // 1️⃣ Fetch all job balances at once
    // ---------------------------------------------------------
    const [jobs] = await connection.query(
      `SELECT id, balanceDue AS due FROM job WHERE id IN (?)`,
      [orderedJobs]
    );

    const jobMap = {};
    for (const job of jobs) jobMap[job.id] = job;

    // Collect bulk insert rows
    let bulkValues = [];

    // ---------------------------------------------------------
    // 2️⃣ Allocation logic
    // ---------------------------------------------------------
    for (const jobId of orderedJobs) {
      if (remaining <= 0) break;

      const job = jobMap[jobId];
      if (!job) continue;

      const allocateAmount = Math.min(job.due, remaining);
      remaining -= allocateAmount;

      const txnId = uuid();
      transactionIds.push(txnId);

      bulkValues.push([
        txnId,                   // id
        "payment",               // transactionType
        null,                    // transactionMode
        null,                    // relatedUser
        customerId,              // relatedCustomer
        jobId,                   // relatedJob
        allocateAmount,          // amount
        null,                    // cleanerAmount
        null,                    // clengoAmount
        paymentMethod,           // paymentMethod
        null,                    // notes
        null,                    // reversedTransaction
        new Date()               // createdAt
      ]);

      allocations.push({
        jobId,
        amount: allocateAmount,
        status: allocateAmount === job.due ? "fully_paid" : "partially_paid"
      });
    }

    // ---------------------------------------------------------
    // 3️⃣ Bulk INSERT (matches your schema exactly)
    // ---------------------------------------------------------
    if (bulkValues.length > 0) {
      await connection.query(
        `INSERT INTO transaction (
          id, transactionType, transactionMode, relatedUser,
          relatedCustomer, relatedJob, amount, cleanerAmount,
          clengoAmount, paymentMethod, notes, reversedTransaction,
          createdAt
        ) VALUES ?`,
        [bulkValues]
      );
    }

    // ---------------------------------------------------------
    // 4️⃣ Successful response
    // ---------------------------------------------------------
    return res.json({
      success: true,
      data: {
        customerId,
        totalAmount: amount,
        allocated: amount - remaining,
        remaining,
        allocations,
        transactionIds
      },
      message: "Payment allocated successfully"
    });

  } catch (err) {
    console.error("Allocate error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  } finally {
    connection.release();
  }
}


module.exports = {
  getAllTransactions,
  getTransactionById,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    allocatePayment
};