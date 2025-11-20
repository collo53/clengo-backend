const { pool } = require("../config/db");
const { v4: uuid } = require("uuid");


async function listPayouts(req, res) {
  const connection = await pool.getConnection();
  try {
    const {
      status,
      cleanerId,
      startDate,
      endDate,
      paymentMethod,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc"
    } = req.query;

    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push("status = ?");
      params.push(status);
    }
    if (cleanerId) {
      whereClauses.push("cleanerId = ?");
      params.push(cleanerId);
    }
    if (paymentMethod) {
      whereClauses.push("paymentMethod = ?");
      params.push(paymentMethod);
    }
    if (startDate) {
      whereClauses.push("createdAt >= ?");
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push("createdAt <= ?");
      params.push(endDate);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Pagination
    const offset = (page - 1) * limit;

    // Fetch total count for pagination
    const [[{ totalItems }]] = await connection.query(
      `SELECT COUNT(*) AS totalItems FROM payouts ${whereSQL}`,
      params
    );

    const totalPages = Math.ceil(totalItems / limit);

    // Fetch paginated data
    const [rows] = await connection.query(
      `SELECT * FROM payouts ${whereSQL} ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    // Compute summary
    const [[summary]] = await connection.query(
      `SELECT 
        SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) AS totalPaid,
        SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) AS totalPending,
        SUM(CASE WHEN status='failed' THEN amount ELSE 0 END) AS totalFailed
       FROM payouts ${whereSQL}`,
      params
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages,
        totalItems,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      },
      summary
    });

  } catch (err) {
    console.error("❌ Error fetching payouts:", err);
    res.status(500).json({ success: false, message: "Error fetching payouts", error: err.message });
  } finally {
    connection.release();
  }
}

async function getPayoutById(req, res) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [rows] = await connection.query(
      `SELECT p.*, u.firstName, u.lastName, u.email
       FROM payouts p
       JOIN user u ON u.id = p.cleanerId
       WHERE p.id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }

    const payout = rows[0];

    res.status(200).json({
      success: true,
      data: {
        payoutId: payout.id,
        cleaner: {
          id: payout.cleanerId,
          name: `${payout.firstName} ${payout.lastName}`,
          email: payout.email,
          bankDetails: payout.notes?.bankDetails || null
        },
        amount: parseFloat(payout.amount),
        paymentMethod: payout.paymentMethod,
        status: payout.status,
        notes: payout.notes || null,
        createdAt: payout.createdAt,
        updatedAt: payout.updatedAt
      }
    });

  } catch (err) {
    console.error("❌ Error fetching payout:", err);
    res.status(500).json({ success: false, message: "Error fetching payout", error: err.message });
  } finally {
    connection.release();
  }
}


async function createPayout(req, res) {
  const connection = await pool.getConnection();
  try {
    const { cleanerId, amount, paymentMethod, status, notes } = req.body;

    if (!cleanerId || !amount) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const payoutId = uuid();

    await connection.query(
      `INSERT INTO payouts 
      (id, cleanerId, amount, status, paymentMethod, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [payoutId, cleanerId, amount, status || "pending", paymentMethod || null, JSON.stringify(notes) || null]
    );

    res.status(201).json({
      success: true,
      data: { payoutId, cleanerId, amount, status: status || "pending", createdAt: new Date() },
      message: "Payout recorded successfully"
    });

  } catch (err) {
    console.error("❌ Error creating payout:", err);
    res.status(500).json({ success: false, message: "Error creating payout", error: err.message });
  } finally {
    connection.release();
  }
}

async function updatePayout(req, res) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, transactionId, paidAt } = req.body;

    if (!status && !transactionId && !paidAt) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const fields = [];
    const values = [];

    if (status) { fields.push("status = ?"); values.push(status); }
    if (transactionId) { fields.push("notes = JSON_SET(COALESCE(notes,'{}'), '$.transactionId', ?)"); values.push(transactionId); }
    if (paidAt) { fields.push("notes = JSON_SET(COALESCE(notes,'{}'), '$.paidAt', ?)"); values.push(paidAt); }

    values.push(id);

    await connection.query(
      `UPDATE payouts SET ${fields.join(", ")}, updatedAt = NOW(3) WHERE id = ?`,
      values
    );

    res.status(200).json({
      success: true,
      data: { payoutId: id, status, updatedAt: new Date() },
      message: "Payout updated successfully"
    });

  } catch (err) {
    console.error("❌ Error updating payout:", err);
    res.status(500).json({ success: false, message: "Error updating payout", error: err.message });
  } finally {
    connection.release();
  }
}

async function batchCreatePayouts(req, res) {
  const connection = await pool.getConnection();
  try {
    const { payouts, paymentMethod, status } = req.body;
    if (!payouts?.length) {
      return res.status(400).json({ success: false, message: "No payouts provided" });
    }

    const bulkValues = [];
    const payoutIds = [];
    let totalAmount = 0;

    for (const p of payouts) {
      const payoutId = uuid();
      bulkValues.push([payoutId, p.cleanerId, p.amount, status || "pending", paymentMethod || null, null]);
      payoutIds.push(payoutId);
      totalAmount += Number(p.amount);
    }

    await connection.query(
      `INSERT INTO payouts 
        (id, cleanerId, amount, status, paymentMethod, notes, createdAt, updatedAt) 
        VALUES ${bulkValues.map(() => "(?, ?, ?, ?, ?, ?, NOW(3), NOW(3))").join(", ")}`,
      bulkValues.flat()
    );

    res.status(201).json({
      success: true,
      data: { created: payouts.length, failed: 0, payoutIds, totalAmount },
      message: "Batch payouts created successfully"
    });

  } catch (err) {
    console.error("❌ Error batch creating payouts:", err);
    res.status(500).json({ success: false, message: "Error batch creating payouts", error: err.message });
  } finally {
    connection.release();
  }
}

module.exports={
    listPayouts,
    getPayoutById,
    createPayout,
    updatePayout,
    batchCreatePayouts
};
