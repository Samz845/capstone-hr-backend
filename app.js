import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import hrRoutes from "./routes/hrRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import checklistRoutes from "./routes/checklistRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import cookieParser from "cookie-parser";

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "https://capstone-smartstartapp.netlify.app",
];

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ success: true, message: "Capstone Project HR API is running..." });
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/checklists", checklistRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/messages", messageRoutes);

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);
  res.status(500).json({ success: false, message: "Server error" });
});

export default app;
