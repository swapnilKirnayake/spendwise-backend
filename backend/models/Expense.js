const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "food",
      "transport",
      "shopping",
      "utilities",
      "entertainment",
      "other",
    ],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  receipt: {
    type: String,
    default: null,
  },
  //Split expense fields
  splitCount: {
    type: Number,
    default: 1, // 1 normal expense
  },
    perPersonAmount:{
    type: Number,
    default: function (){
      return this.amount;
    },
  },

  splits: [
  {
    name: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
],
});

// Index for efficient queries
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
