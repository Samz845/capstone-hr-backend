import express from "express";
import { protect } from "../middleware/authMiddleware.js";

// User controllers
import {
  loginUser,
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  logOut,
  getUsersWithOverview,
  createAdmin,
  inviteEmployee,
  verifyInvitation,
  completeRegistration,
  resendInvitation,
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
router.post("/register", createAdmin);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.get("/invitation/:token", verifyInvitation);
router.post("/complete-registration", completeRegistration);

/**
 * ===============================
 * Protected Routes
 * ===============================
 */
router.get("/", protect, authorizeRoles("admin", "hr"), getUsersWithOverview);
router.get("/admin", protect, authorizeRoles("admin", "hr"), getAllUsers);
router.get("/me", protect, getMe);
router.get("/:id", protect, authorizeRoles("admin", "hr"), getUserById);
router.patch("/:id", protect, ownerShipCheck, updateUser);
router.delete("/:id", protect, authorizeRoles("admin", "hr"), deleteUser);
router.post("/logout", protect, logOut);
router.post("/invite", protect, authorizeRoles("admin", "hr"), inviteEmployee);
router.post(
  "/resend-invitation/:id",
  protect,
  authorizeRoles("admin", "hr"),
  resendInvitation,
);
export default router;
