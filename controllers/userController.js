import User from "../model/userModel.js";
import { OAuth2Client } from "google-auth-library";
import { generateToken } from "../helpers.js";
import Company from "../model/companyModel.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// REGISTER NEW USER
export const createUser = async (req, res) => {
  const { name, email, password, role, department, companyName, companyId } =
    req.body;

  console.log({
    role,
    companyName,
    companyId,
  });

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

    //Employee joins an existing Company
    if (normalizedRole === "employee") {
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company id is required",
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

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      department: department || "General",
      company: company?._id || null,
    });

    generateToken(newUser, res);

    res.status(201).json({
      success: true,
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
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
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

    generateToken(user, res);

    res.json({
      success: true,
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
      generateToken(user, res);

      return res.status(200).json({
        success: true,
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

    generateToken(user, res);

    res.status(201).json({
      success: true,
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

// GET ALL USERS
export const getAllUsers = async (req, res) => {
  try {
    const filter = {
      role: "employee",
      company: req.user.company,
      isDeleted: true,
    };

    const users = await User.find(filter).select("-password");
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ success: false, message: "Server error" });
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
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.json({ success: true, data: user });
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
