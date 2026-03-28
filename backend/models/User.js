const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  monthlyBudgets: [
    {
      month: { type: Number, required: true }, // 1-12
      year: { type: Number, required: true },
      budget: { type: Number, required: true, default: 20000 },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
