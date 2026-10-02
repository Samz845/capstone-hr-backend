import express from "express";
import { protect } from "../middleware/authMiddleware.js";

// User controllers
import {
  createUser,
  loginUser,
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  logOut,
} from "../controllers/userController.js";

// Google auth controller (separate file)
import { googleAuth } from "../controllers/googleAuthController.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ownerShipCheck } from "../middleware/ownerShipCheck.js";

const router = express.Router();

/**
 * ===============================
 * Public Routes
 * ===============================
 */
router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);

/**
 * ===============================
 * Protected Routes
 * ===============================
 */
router.get("/me", protect, getMe);
router.get("/", protect, authorizeRoles("admin", "hr"), getAllUsers);
router.get("/:id", protect, authorizeRoles("admin", "hr"), getUserById);
router.patch("/:id", protect, ownerShipCheck, updateUser);
router.delete("/:id", protect, authorizeRoles("admin", "hr"), deleteUser);
router.post("/logout", protect, logOut);

export default router;
