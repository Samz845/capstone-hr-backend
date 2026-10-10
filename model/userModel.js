import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      trim: true,
      enum: ["employee", "manager", "admin", "hr", "intern"],
      lowercase: true,
      default: "employee",
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return this.authType === "local";
      },
      trim: true,
    },

    department: {
      type: String,
      default: "General",
      trim: true,
    },

    authType: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    googleId: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    profileImage: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    jobTitle: {
      type: String,
      trim: true,
      default: "",
    },
    contractType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time",
    },
  },
  { timestamps: true },
);

// Hash password ONLY if it exists & changed
userSchema.pre("save", async function (next) {
  if (!this.password) return next();
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password ONLY for local users
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.authType !== "local" || !this.password) return false;

  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
