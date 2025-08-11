import bcrypt from "bcryptjs";
import { db } from "../libs/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../libs/email.js";

export const registerUser = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    if (!email || !password || !name) {
      return res.status(400).json({
        message: " All fields are required",
      });
    }
    console.log("email found");
    const existingUser = await db.User.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const newUser = await db.User.create({
      data: {
        email: email,
        password: hashedPassword,
        name: name,
        verificationToken: verificationToken,
        isVerified: false,
      },
    });
    console.log("user->", newUser);
    try {
      await sendVerificationEmail(newUser.email, verificationToken);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
    }

    res.status(201).json({
      message: "User Created Successfully",
      User: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
      },
    });
  } catch (error) {
    console.error("Error in creating user", error);
    res.status(500).json({
      error: "Error in creating user",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if ((!email, !password)) {
      return res.status(400).json({
        message: " All Fields are required",
      });
    }

    const user = await db.User.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "User Not Found, Please Register",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid Credentials",
      });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: isProduction ? "none" : "strict",
    };

    res.cookie("jwt", token, cookieOptions);

    res.status(200).json({
      message: "User LoggedIn Successfully",
      User: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Error logging in user", error);
    res.status(500).json({
      error: "Error logging in user",
    });
  }
};

export const verifyUser = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({
        message: "Invalid verification link",
      });
    }

    const user = await db.User.findFirst({
      where: {
        verificationToken: token,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: "Invalid verification token or user already verified",
      });
    }
    await db.User.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });
  } catch (error) {
    console.error("Error verifying user:", error);
    return res.status(500).json({
      message: "Error verifying user",
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "strict",
    });
    res.status(200).json({
      success: true,
      message: "User Logged Out Successfully",
    });
  } catch (error) {
    console.error("Error Logging Out User", error);
    res.status(500).json({
      message: "User Logged Out Successfully",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }
    const user = await db.User.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      return res.status(400).json({
        message: "User Not Found",
      });
    }
    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpiry = new Date(Date.now() + 10 * 60 * 1000);
    try {
      await sendPasswordResetEmail(user.email, resetPasswordToken);
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      return res.status(500).json({
        message: "Error sending password reset email",
        success: false,
      });
    }

    await db.User.update({
      where: {
        id: user.id,
      },
      data: {
        resetPasswordToken: resetPasswordToken,
        resetPasswordExpires: resetPasswordExpiry,
      },
    });
    res.status(200).json({
      message: "Password reset email sent successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({
      message: "Error processing forgot password request",
      success: false,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { resetPasswordToken } = req.params;
    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }
    if (!resetPasswordToken) {
      return res.status(400).json({
        message: "Invalid password reset token",
      });
    }

    const user = await db.User.findFirst({
      where: {
        resetPasswordToken: resetPasswordToken,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Password reset token is invalid or has expired",
      });
    }
    const newHashedPassword = await bcrypt.hash(password, 10);
    await db.User.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    return res.status(200).json({
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      message: "Error resetting password",
      success: false,
    });
  }
};
