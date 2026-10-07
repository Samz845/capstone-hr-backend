import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {
  createChecklist,
  addTaskToChecklist,
  assignChecklistToEmployee,
  getAllChecklists,
  getEmployeeChecklist,
  updateTaskProgress,
  getAllEmployeesChecklistProgress,
} from "../controllers/checklistController.js";

const router = express.Router();

/* =======================
   HR / ADMIN ROUTES
======================= */

// Create checklist template
router.post("/", protect, authorizeRoles("hr", "admin"), createChecklist);

// Add task to checklist
router.post(
  "/:checklistId/tasks",
  protect,
  authorizeRoles("hr", "admin"),
  addTaskToChecklist,
);

router.post(
  "/:checklistId/assign",
  protect,
  authorizeRoles("hr", "admin"),
  assignChecklistToEmployee,
);

// Get all checklist templates
router.get("/", protect, authorizeRoles("hr", "admin"), getAllChecklists);

router.get(
  "/dashboard/overview",
  protect,
  authorizeRoles("hr", "admin"),
  getAllEmployeesChecklistProgress,
);

/* =======================
   EMPLOYEE ROUTES
======================= */

// Get own checklist progress
router.get(
  "/my",
  protect,
  authorizeRoles("employee", "intern", "manager"),
  getEmployeeChecklist,
);

// Update own task progress
router.put(
  "/progress/:progressId",
  protect,
  authorizeRoles("employee", "intern", "manager"),
  updateTaskProgress,
);

export default router;
