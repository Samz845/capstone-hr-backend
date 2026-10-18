import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  const token = jwt.sign(
    { id: user._id, role: user.role, company: user.company },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  return token;
};
