import Task from "../model/taskModel.js";
import User from "../model/userModel.js";

export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;

    const userExists = await User.findById(assignedTo);
    if (!userExists)
      return res.status(404).json({ message: "Assigned user not found" });

    const newTask = new Task({
      title,
      description,
      assignedTo,
      status: "Pending",
    });

    const savedTask = await newTask.save();
    res.status(201).json({
      success: true,
      message: "Task created successfully!",
      data: savedTask,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate(
      "assignedTo",
      "name email role department",
    );
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTasksByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tasks = await Task.find({ assignedTo: employeeId }).populate(
      "assignedTo",
      "name email role department",
    );
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!updatedTask)
      return res.status(404).json({ message: "Task not found" });

    res.status(200).json({
      success: true,
      message: "Task updated successfully!",
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addChecklistItem = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { item } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.checklist.push({ item });
    await task.save();

    res.status(201).json({
      success: true,
      message: "Checklist item added!",
      checklist: task.checklist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleChecklistItem = async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const item = task.checklist.id(itemId);
    if (!item)
      return res.status(404).json({ message: "Checklist item not found" });

    item.completed = !item.completed;
    await task.save();

    res.status(200).json({
      success: true,
      message: "Checklist item updated!",
      item,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteChecklistItem = async (req, res) => {
  try {
    const { taskId, itemId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.checklist.id(itemId).remove();
    await task.save();

    res.status(200).json({
      success: true,
      message: "Checklist item removed!",
      checklist: task.checklist,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
