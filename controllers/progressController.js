import Progress from "../model/progressModel.js";
import Task from "../model/taskModel.js";

/**
 * ==========================================
 * Add Progress to a Task
 * ==========================================
 */
export const addProgress = async (req, res) => {
  try {
    const { taskId, status, remarks, progressPercent } = req.body;

    const userId = req.user._id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const progress = await Progress.create({
      task: taskId,
      employee: userId,
      status: status || "In Progress",
      remarks: remarks || "No remarks provided",
      progressPercent: progressPercent ?? 0,
    });

    // Update task status based on percentage
    if (progress.progressPercent === 0) {
      task.status = "Pending";
    } else if (progress.progressPercent >= 100) {
      task.status = "Completed";
    } else {
      task.status = "In Progress";
    }

    await task.save();

    res.status(201).json({
      success: true,
      message: "Progress added successfully!",
      data: progress,
    });
  } catch (error) {
    console.error("Add progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * ==========================================
 * Update Progress Status
 * ==========================================
 */
export const updateProgressStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progressPercent } = req.body;

    const progress = await Progress.findById(id);

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: "Progress not found",
      });
    }

    if (status) progress.status = status;
    if (progressPercent !== undefined)
      progress.progressPercent = progressPercent;

    await progress.save();

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      data: progress,
    });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * ==========================================
 * Get Progress By Task
 * ==========================================
 */
export const getProgressByTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const progressEntries = await Progress.find({ task: taskId })
      .populate("user", "name email role department")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      task: task.title,
      progress: progressEntries,
    });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

/**
 * ==========================================
 * Get My Progress (For Logged-in User)
 * ==========================================
 */
export const getMyProgress = async (req, res) => {
  try {
    const progress = await Progress.find({ user: req.user._id })
      .populate("task", "title status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: progress.length,
      data: progress,
    });
  } catch (error) {
    console.error("Get my progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};
