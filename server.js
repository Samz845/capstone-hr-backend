import dotenv from "dotenv";
import connectDB from "./config/db.js";
import app from "./app.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Show auth mode
if (process.env.FREE_MODE === "true") {
  console.log("Server running in FREE MODE — authentication is disabled!");
} else {
  console.log("Server running in SECURE MODE — authentication is required.");
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
