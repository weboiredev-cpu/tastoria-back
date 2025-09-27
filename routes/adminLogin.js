import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs";
import Admin from "../models/admin.js";


const router = express.Router();

//Login 
router.post("/login", async (req, res) => {
  const { userEmail, password } = req.body;

  try {
    const admin = await Admin.findOne({ userEmail });
    if (!admin) return res.status(401).json({ message: "Invalid Email" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // JWT
    const token = jwt.sign(
      { id: admin._id, userEmail: admin.userEmail },
      process.env.JWT_TOKEN,
      { expiresIn: "7d" }
    );
    res.json({ token, message: "Login Successful" });

  } catch (error) {
    res.status(500).json({ message: "Login Failed", error: error.message });
  }
});

router.post("/create-admin", async (req, res) => {
  try {
    const { userEmail, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      userEmail,
      password: hashedPassword
    });

    await newAdmin.save();
    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;