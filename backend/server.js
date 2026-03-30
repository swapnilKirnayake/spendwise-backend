const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors({
   origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (
      origin.includes("vercel.app") ||
      origin.includes("localhost")
      ) {
      return callback(null, true);
    }
      return callback(null, false);  
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const MONGO_URI =
  process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error", err));

// routes
const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

app.use("/api", authRoutes);
app.use("/api", expenseRoutes);

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));
