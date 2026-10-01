import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    logo: {
      type: String,
      default: "",
    },

    industry: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Company = mongoose.model("Company", companySchema);

export default Company;
