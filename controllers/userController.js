import User from "../model/userModel.js";
import { OAuth2Client } from "google-auth-library";
import { generateToken } from "../helpers.js";
import Company from "../model/companyModel.js";
import Progress from "../model/progressModel.js";
import crypto from "crypto";
import { sendInvitationEmail } from "../utils/sendEmail.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// REGISTER NEW ADMIN
export const createAdmin = async (req, res) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    role,
    department,
    companyName,
  } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();
    const normalizedRole = role?.toLowerCase() || "employee";

    // Check if user already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    if (!["admin", "hr"].includes(normalizedRole)) {
      return res.status(403).json({
        success: false,
        message: "Employee accounts must be created through an invitation",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    let company = null;

    // Admin/HR are allowed to create a company during registration
    if (["admin", "hr"].includes(normalizedRole)) {
      if (!companyName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Company name is required",
        });
      }

      // Check if company already exists
      company = await Company.findOne({
        name: companyName.trim(),
      });

      if (company) {
        return res.status(400).json({
          success: false,
          message: "Company already exists",
        });
      }

      company = await Company.create({
        name: companyName.trim(),
      });
    }

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      department: department || "General",
      company: company?._id || null,
      accountStatus: "active",
      activatedAt: new Date(),
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      token,
      message: "User created successfully",
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        company: newUser.company,
        authType: newUser.authType,
        createdAt: newUser.createdAt,
        accountStatus: newUser.accountStatus,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid email or password" });
    }
    // BLOCK GOOGLE ACCOUNTS FROM PASSWORD LOGIN
    if (user.authType === "google") {
      return res.status(400).json({
        success: false,
        message: "Please login using Google",
      });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      message: "Logged in successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        createdAt: user.createdAt,
        company: user.company,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GOOGLE AUTH LOGIN/SIGNUP
export const googleAuth = async (req, res) => {
  try {
    const { idToken, role, companyName, companyId } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google token is required",
      });
    }

    const normalizedRole = role?.toLowerCase();

    if (!["admin", "hr", "employee"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, name, picture } = payload;

    // Check if user already exists
    let user = await User.findOne({
      email: email.toLowerCase(),
    });

    // Existing user → login
    if (user) {
      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        token,
        message: "Google authentication successful",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          company: user.company,
          profileImage: user.profileImage,
          authType: user.authType,
          createdAt: user.createdAt,
        },
      });
    }

    let company;

    // ADMIN / HR → create company
    if (["admin", "hr"].includes(normalizedRole)) {
      if (!companyName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Company name is required",
        });
      }

      company = await Company.findOne({
        name: companyName.trim(),
      });

      if (company) {
        return res.status(400).json({
          success: false,
          message: "Company already exists",
        });
      }

      company = await Company.create({
        name: companyName.trim(),
      });
    }

    // EMPLOYEE → join existing company
    if (normalizedRole === "employee") {
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
      }

      company = await Company.findById(companyId);

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }
    }

    // Create Google user
    user = await User.create({
      name,
      email: email.toLowerCase(),
      role: normalizedRole,
      department: "General",
      company: company._id,
      profileImage: picture || "",
      authType: "google",
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      message: "Google authentication successful",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        company: user.company,
        profileImage: user.profileImage,
        authType: user.authType,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);

    res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};

// GET CURRENT USER
export const getMe = async (req, res) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getUsersWithOverview = async (req, res) => {
  try {
    const filter = {
      role: "employee",
      company: req.user.company,
      isDeleted: false,
    };

    const users = await User.find(filter).select("-password").lean();

    const userIds = users.map((user) => user._id);

    const progressRecords = await Progress.find({
      employee: { $in: userIds },
    })
      .select("employee status")
      .lean();

    // Group progress records by employee
    const progressByEmployee = new Map();

    for (const record of progressRecords) {
      const employeeId = record.employee.toString();

      if (!progressByEmployee.has(employeeId)) {
        progressByEmployee.set(employeeId, []);
      }

      progressByEmployee.get(employeeId).push(record.status);
    }

    const employeesWithProgress = users.map((user) => {
      const records = progressByEmployee.get(user._id.toString()) ?? [];

      const totalTasks = records.length;

      const completedTasks = records.filter(
        (status) => status === "completed",
      ).length;

      const startedTasks = records.some(
        (status) => status === "in_progress" || status === "completed",
      );

      const progress =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      let status = "not started";

      if (totalTasks > 0 && completedTasks === totalTasks) {
        status = "completed";
      } else if (startedTasks) {
        status = "in-progress";
      }

      return {
        ...user,
        progress,
        status,
      };
    });

    return res.status(200).json({
      success: true,
      data: employeesWithProgress,
    });
  } catch (error) {
    console.error("Get users overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET ALL USERS
export const getAllUsers = async (req, res) => {
  try {
    const filter = {
      role: "employee",
      company: req.user.company,
      isDeleted: false,
    };
    const status = req.query.status || "all";
    const search = req.query.search?.trim() || "";

    //search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    //sorting
    const allowedSortFields = ["name", "department", "createdAt"];
    const requestedSort = req.query.sortBy;
    const sortBy = allowedSortFields.includes(requestedSort)
      ? requestedSort
      : "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;
    const sortObj = {};
    sortObj[sortBy] = order;

    const requestedPage = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 5;
    if (
      !Number.isInteger(requestedPage) ||
      !Number.isInteger(requestedLimit) ||
      requestedPage < 1 ||
      requestedLimit < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive integers",
      });
    }

    const page = requestedPage;
    const limit = Math.min(requestedLimit, 100);

    const users = await User.find(filter).sort(sortObj).select("-password");

    const userIds = users.map((user) => user._id);

    const progressRecords = await Progress.find({
      employee: { $in: userIds },
    })
      .select("employee status")
      .lean();

    const progressByEmployee = new Map();

    for (const record of progressRecords) {
      const employeeId = record.employee.toString();

      if (!progressByEmployee.has(employeeId)) {
        progressByEmployee.set(employeeId, []);
      }

      progressByEmployee.get(employeeId).push(record.status);
    }

    const employeesWithProgress = users.map((user) => {
      const records = progressByEmployee.get(user._id.toString()) ?? [];
      const totalTasks = records.length;

      const completedTasks = records.filter(
        (task) => task.status === "completed",
      ).length;

      const startedTasks = records.some(
        (task) => task.status === "in_progress" || task.status === "completed",
      );

      const progress =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      let status = "not started";

      if (totalTasks > 0 && completedTasks === totalTasks) {
        status = "completed";
      } else if (startedTasks) {
        status = "in-progress";
      }

      return {
        ...user.toObject(),
        progress,
        status,
      };
    });

    //filtering
    const filteredEmployees =
      status === "all"
        ? employeesWithProgress
        : employeesWithProgress.filter(
            (employee) => employee.status === status,
          );

    //pagination
    const totalEmployees = filteredEmployees.length;
    const totalPages = Math.ceil(totalEmployees / limit);
    const skip = (page - 1) * limit;
    const employees = filteredEmployees.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      data: employees,
      pages: {
        currentPage: page,
        limit,
        totalPages,
        totalEmployees,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET USER BY ID
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findOne({
      company: req.user.company,
      _id: userId,
      role: "employee",
      isDeleted: false,
    })
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const records = await Progress.find({
      employee: userId,
    })
      .populate("task", "_id title")
      .select("status task")
      .lean();

    const totalTasks = records.length;
    const completedTasks = records.filter(
      (task) => task.status === "completed",
    ).length;

    const startedTasks = records.some(
      (task) => task.status === "in_progress" || task.status === "completed",
    );

    const progress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let status = "not started";

    if (totalTasks > 0 && completedTasks === totalTasks) {
      status = "completed";
    } else if (startedTasks) {
      status = "in-progress";
    }
    res.json({
      success: true,
      data: { ...user, progress, status, completedTasks, totalTasks, records },
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "email",
      "password",
      "department",
      "phone",
      "address",
      "profileImage",
      "jobTitle",
      "status",
      "contractType",
    ];

    const user = req.targetUser;

    for (const field of allowedFields) {
      const value = req.body[field];
      if (value !== undefined) {
        Object.assign(user, {
          [field]: value,
        });
      }
    }
    await user.save();

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        updatedAt: user.updatedAt,
        address: user.address,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const logOut = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
};

export const inviteEmployee = async (req, res) => {
  try {
    const { name, email, department, jobTitle, contractType } = req.body;
    if (!name || !email || !jobTitle || !contractType) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        success: false,
        message: "You must be associated with a company to invite employees",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const invitationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const employee = await User.create({
      name,
      email: normalizedEmail,
      role: "employee",
      company: req.user.company,
      department: department || "General",
      jobTitle,
      contractType: contractType || "Full-time",
      authType: "local",
      accountStatus: "invited",
      invitationToken: hashedToken,
      invitationExpires,
      invitedAt: new Date(),
    });

    const invitationLink = `${process.env.Client_URL}/accept-invite/${rawToken}`;
    console.log("Invitation link:", invitationLink);
    // await sendInvitationEmail(normalizedEmail, invitationLink, name);

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        jobTitle: employee.jobTitle,
        accountStatus: employee.accountStatus,
        invitedAt: employee.invitedAt,
        invitationExpires: employee.invitationExpires,
        invitationToken: employee.invitationToken,
      },
    });
  } catch (error) {
    console.error("Invite employee error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const verifyInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const employee = await User.findOne({
      invitationToken: hashedToken,
      invitationExpires: { $gt: new Date() },
      accountStatus: "invited",
    }).select("name email department jobTitle");

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Invitation link is invalid or has expired.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invitation verified successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Verify invitation error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify invitation",
    });
  }
};

export const completeRegistration = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Token, password and confirmation are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const employee = await User.findOne({
      invitationToken: hashedToken,
      invitationExpires: { $gt: new Date() },
      accountStatus: "invited",
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Invitation link is invalid or has expired",
      });
    }

    employee.password = password;
    employee.accountStatus = "active";
    employee.activatedAt = new Date();

    employee.invitationToken = null;
    employee.invitationExpires = null;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Registration completed successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Complete registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to complete registration",
    });
  }
};

export const resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the employee within the admin's company
    const employee = await User.findOne({
      _id: id,
      company: req.user.company,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Only invited employees can receive another invitation
    if (employee.accountStatus !== "invited") {
      return res.status(400).json({
        success: false,
        message: "This employee does not have a pending invitation",
      });
    }

    // Generate a new invitation token
    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    // Set a fresh 24-hour expiry
    const invitationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Replace the old invitation details
    employee.invitationToken = hashedToken;
    employee.invitationExpires = invitationExpires;
    employee.invitedAt = new Date();

    await employee.save();

    const invitationLink = `${process.env.Client_URL}/accept-invite/${rawToken}`;

    console.log("Resent invitation link:", invitationLink);

    return res.status(200).json({
      success: true,
      message: "Invitation link resent successfully",
      data: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        accountStatus: employee.accountStatus,
        invitedAt: employee.invitedAt,
        invitationExpires: employee.invitationExpires,
      },
    });
  } catch (error) {
    console.error("Resend invitation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to resend invitation",
    });
  }
};
