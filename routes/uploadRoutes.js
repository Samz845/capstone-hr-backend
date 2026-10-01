import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

import {
  uploadFile,
  getDocuments,
  reviewDocument,
} from "../controllers/uploadController.js";

const router = express.Router();

router.post("/upload", protect, upload.single("document"), uploadFile);

router.get("/", protect, getDocuments);

router.put("/:id/review", protect, reviewDocument);

export default router;
