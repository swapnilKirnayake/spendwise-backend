const Expense = require("../models/Expense");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret"; // Use same secret as authController

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // Use the JWT_SECRET constant
    req.userId = decoded.id; // Changed from decoded.userId to decoded.id
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
};

// Multer storage config for receipt uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName =
      "receipt-" + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 5MB limit
});


// Create a new expense
const createExpense = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const description = req.body.description;
    const category = req.body.category?.toLowerCase() || "other";
    const date = req.body.date;
    const splitCount = req.body.splitCount;
    const splits = req.body.splits ? JSON.parse(req.body.splits) : [];

    // Handle uploaded receipt file (if any)
    let receiptPath = null;
    if (req.file) {
      receiptPath = `/uploads/${req.file.filename}`;
    }

    // Ensure date is properly converted to Date object
    const expenseDate = date ? new Date(date) : new Date();

    const count = splits.length > 0 ? splits.length : 1;

   const perPersonAmount =
   splits.length > 0
    ? splits[0].amount
    : parseFloat((amount / count).toFixed(2));

    const expense = new Expense({
      userId: req.userId,
      amount,
      description,
      category,
      date: expenseDate,
      receipt: receiptPath,
      splitCount: count,
      perPersonAmount: perPersonAmount,
      splits: splits
    });

    await expense.save();
    res.status(201).json({ message: "Expense created successfully", expense });
   } catch (error) {
    console.error("Error creating expense:", error);
    res
      .status(400)
      .json({ message: "Error creating expense", error: error.message });
  }
};

// Get all expenses for a user with filters
const getExpenses = async (req, res) => {
  try {
    const { filter, startDate, endDate, date } = req.query;
    const userId = new mongoose.Types.ObjectId(req.userId);

    let dateFilter = {};

    if (filter === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      dateFilter = { date: { $gte: todayStart, $lte: todayEnd } };
    } else if (filter === "week") {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      weekEnd.setHours(23, 59, 59, 999);
      dateFilter = { date: { $gte: weekStart, $lte: weekEnd } };
    } else if (filter === "month") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      dateFilter = { date: { $gte: monthStart, $lte: monthEnd } };
    } else if (filter === "custom" && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { date: { $gte: start, $lte: end } };
    } else if (date) {
      // Specific date
      const specificDate = new Date(date);
      const dateStart = new Date(specificDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(specificDate);
      dateEnd.setHours(23, 59, 59, 999);
      dateFilter = { date: { $gte: dateStart, $lte: dateEnd } };
    }

    const expenses = await Expense.find({
      userId,
      ...dateFilter,
    }).sort({
      date: -1,
    });

    // Calculate total for filtered expenses
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    res.json({
      expenses,
      total,
      count: expenses.length,
      filter: filter || "all",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching expenses", error: error.message });
  }
};

// Get expense statistics and reports
const getExpenseReports = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { filter, startDate, endDate, date } = req.query;

    const now = new Date();

    // Determine date range based on filter
    let reportStart, reportEnd;

    if (filter === "today") {
      reportStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      reportEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
    } else if (filter === "week") {
      reportStart = new Date(now);
      reportStart.setDate(now.getDate() - now.getDay());
      reportStart.setHours(0, 0, 0, 0);
      reportEnd = new Date(reportStart);
      reportEnd.setDate(reportStart.getDate() + 6);
      reportEnd.setHours(23, 59, 59, 999);
    } else if (filter === "custom" && startDate && endDate) {
      reportStart = new Date(startDate);
      reportStart.setHours(0, 0, 0, 0);
      reportEnd = new Date(endDate);
      reportEnd.setHours(23, 59, 59, 999);
    } else if (date) {
      const specificDate = new Date(date);
      reportStart = new Date(specificDate);
      reportStart.setHours(0, 0, 0, 0);
      reportEnd = new Date(specificDate);
      reportEnd.setHours(23, 59, 59, 999);
    } else {
      // Default to current month
      reportStart = new Date(now.getFullYear(), now.getMonth(), 1);
      reportEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
    }

    // Get today's start and end for today's total
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    // Get user's monthly budget
    const user = await User.findById(userId);
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    let monthlyBudget = 20000; // Default budget
    if (user && user.monthlyBudgets) {
      const budgetEntry = user.monthlyBudgets.find(
        (b) => b.month === currentMonth && b.year === currentYear
      );
      if (budgetEntry) {
        monthlyBudget = budgetEntry.budget;
      }
    }

    // Aggregate expenses by category for the selected period
    const categoryStats = await Expense.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: reportStart, $lte: reportEnd },
        },
      },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);

    // Calculate total spent in selected period
    const periodTotal = categoryStats.reduce(
      (sum, cat) => sum + cat.totalAmount,
      0
    );

    // Calculate today's total
    const todayTotal = await Expense.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    // Get recent expenses from the filtered period
    const recentExpenses = await Expense.find({
      userId,
      date: { $gte: reportStart, $lte: reportEnd },
    })
      .sort({ date: -1 })
      .limit(10);

    // Category mapping for icons and colors
    const categoryMapping = {
      food: { icon: "🍽️", color: "bg-cyan-500", name: "Food" },
      transport: { icon: "🚗", color: "bg-orange-500", name: "Transport" },
      shopping: { icon: "🛍️", color: "bg-yellow-500", name: "Shopping" },
      utilities: { icon: "⚡", color: "bg-blue-500", name: "Utilities" },
      entertainment: {
        icon: "🎭",
        color: "bg-purple-500",
        name: "Entertainment",
      },
      other: { icon: "💰", color: "bg-gray-500", name: "Other" },
    };

    // Format category data with percentages
    const formattedCategoryData = categoryStats.map((cat) => {
      const percentage =
        periodTotal > 0 ? (cat.totalAmount / periodTotal) * 100 : 0;
      const categoryInfo = categoryMapping[cat._id] || categoryMapping.other;

      return {
        name: categoryInfo.name,
        amount: cat.totalAmount,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
        icon: categoryInfo.icon,
        color: categoryInfo.color,
        progressColor: categoryInfo.color,
        count: cat.count,
      };
    });

    // Generate insights
    const insights = [];
    if (formattedCategoryData.length > 0) {
      const topCategory = formattedCategoryData[0];
      insights.push(
        `${topCategory.name} accounts for ${topCategory.percentage}% of your total spending`
      );

      if (formattedCategoryData.length > 1) {
        const secondCategory = formattedCategoryData[1];
        insights.push(
          `Your top 2 categories (${topCategory.name} and ${
            secondCategory.name
          }) make up ${
            Math.round(
              (topCategory.percentage + secondCategory.percentage) * 10
            ) / 10
          }% of expenses`
        );
      }
    }

    // Generate budget alerts
    const budgetPercentage =
      monthlyBudget > 0 ? (periodTotal / monthlyBudget) * 100 : 0;
    let budgetAlert = null;

    if (budgetPercentage >= 100) {
      budgetAlert = {
        type: "danger",
        message: `⚠️ Budget Exceeded! You've spent ₹${periodTotal.toLocaleString()} which is ${Math.round(
          budgetPercentage
        )}% of your ₹${monthlyBudget.toLocaleString()} budget.`,
        percentage: Math.round(budgetPercentage),
      };
    } else if (budgetPercentage >= 90) {
      budgetAlert = {
        type: "warning",
        message: `⚠️ Budget Alert! You've reached ${Math.round(
          budgetPercentage
        )}% of your monthly budget. Only ₹${(
          monthlyBudget - periodTotal
        ).toLocaleString()} remaining.`,
        percentage: Math.round(budgetPercentage),
      };
    } else if (budgetPercentage >= 75) {
      budgetAlert = {
        type: "caution",
        message: `💡 You've used ${Math.round(
          budgetPercentage
        )}% of your monthly budget. ₹${(
          monthlyBudget - periodTotal
        ).toLocaleString()} remaining.`,
        percentage: Math.round(budgetPercentage),
      };
    }

    const response = {
      totalSpent: periodTotal,
      todayTotal: todayTotal[0]?.total || 0,
      categoryData: formattedCategoryData,
      insights,
      budgetAlert,
      recentExpenses: recentExpenses.map((expense) => ({
        id: expense._id,
        name: expense.description,
        category: categoryMapping[expense.category]?.name || "Other",
        amount: expense.amount,
        splitCount: expense.splitCount || 1,
        perPersonAmount: expense.perPersonAmount || expense.amount,
        splits: expense.splits || [],
        date: expense.date,
        icon: categoryMapping[expense.category]?.icon || "💰",
        color: categoryMapping[expense.category]?.color || "bg-gray-500",
        receipt: expense.receipt || null 
      })),
      summary: {
        highestCategory: formattedCategoryData[0]?.name || "None",
        lowestCategory:
          formattedCategoryData[formattedCategoryData.length - 1]?.name ||
          "None",
        totalCategories: formattedCategoryData.length,
        monthlyBudget: monthlyBudget,
        usedBudget: periodTotal,
        currentMonth: currentMonth,
        currentYear: currentYear,
        filter: filter || "month",
        dateRange: {
          start: reportStart,
          end: reportEnd,
        },
      },
    };

    res.json(response);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error generating reports", error: error.message });
  }
};

// Get monthly expense totals for the last 6 months
const getMonthlyTrends = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId); // Convert to ObjectId
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Expense.aggregate([
      {
        $match: {
          userId: userId,
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    res.json(monthlyTrends);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching monthly trends", error: error.message });
  }
};

// Update monthly budget
const updateMonthlyBudget = async (req, res) => {
  try {
    const userId = req.userId;
    const { budget, month, year } = req.body;

    // Validation
    if (!budget || budget <= 0) {
      return res
        .status(400)
        .json({ message: "Please provide a valid budget amount" });
    }

    if (!month || month < 1 || month > 12) {
      return res
        .status(400)
        .json({ message: "Please provide a valid month (1-12)" });
    }

    if (!year || year < 2000) {
      return res.status(400).json({ message: "Please provide a valid year" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if budget entry exists for this month/year
    const existingBudgetIndex = user.monthlyBudgets.findIndex(
      (b) => b.month === month && b.year === year
    );

    if (existingBudgetIndex >= 0) {
      // Update existing budget
      user.monthlyBudgets[existingBudgetIndex].budget = budget;
    } else {
      // Add new budget entry
      user.monthlyBudgets.push({ month, year, budget });
    }

    await user.save();

    res.json({
      message: "Budget updated successfully",
      budget: {
        month,
        year,
        budget,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating budget", error: error.message });
  }
};

// Delete an expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Find the expense and verify ownership
    const expense = await Expense.findOne({ _id: id, userId: userId });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found or you don't have permission to delete it",
      });
    }

    await Expense.deleteOne({ _id: id });

    res.json({
      message: "Expense deleted successfully",
      deletedExpenseId: id,
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res
      .status(500)
      .json({ message: "Error deleting expense", error: error.message });
  }
};

module.exports = {
  verifyToken,
  upload,
  createExpense,
  getExpenses,
  getExpenseReports,
  getMonthlyTrends,
  updateMonthlyBudget,
  deleteExpense,
};
