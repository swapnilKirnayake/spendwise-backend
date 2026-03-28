const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const {
  verifyToken,
  createExpense,
  getExpenses,
  getExpenseReports,
  getMonthlyTrends,
  updateMonthlyBudget,
  deleteExpense,
  upload,
} = require("../controllers/expenseController");

// All routes require authentication
router.use(verifyToken);

// POST /api/expenses - Create new expense
router.post("/expenses", upload.single("receipt"), createExpense);

// GET /api/expenses - Get all expenses for user
router.get("/expenses", getExpenses);

// GET /api/expenses/reports - Get expense reports and analytics
router.get("/expenses/reports", getExpenseReports);

// GET /api/expenses/trends - Get monthly trends
router.get("/expenses/trends", getMonthlyTrends);

// PUT /api/expenses/budget - Update monthly budget
router.put("/expenses/budget", updateMonthlyBudget);

// DELETE /api/expenses/:id - Delete an expense
router.delete("/expenses/:id", deleteExpense);

module.exports = router;
