import User from "../model/userModel.js";

export const ownerShipCheck = async (req, res, next) => {
  try {
    const targetUser = await User.findOne({
      _id: req.params.id,
      company: req.user.company,
      isDeleted: false,
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isAdmin = ["admin", "hr"].includes(req.user.role);
    const isOwner = req.user._id.toString() === targetUser._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
    req.targetUser = targetUser;
    next();
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
