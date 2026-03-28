const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors({
  origin: ["https://spendwise-frontend-bice.vercel.app",
           "https://spendwise-frontend-pw0is7qgb-swapnil-kirnayakes-projects.vercel.app"]
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/spendwise";

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error", err));

// routes
const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

app.use("/api", authRoutes);
app.use("/api", expenseRoutes);

const port = process.env.PORT || 4000;
app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));
