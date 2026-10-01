import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    checklist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checklist",
      required: true,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },

    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Auto-set completedAt
progressSchema.pre("save", function (next) {
  if (this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

export default mongoose.model("Progress", progressSchema);
