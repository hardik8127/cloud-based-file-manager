import jwt from "jsonwebtoken";
import { db } from "../libs/db.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({
        message: "Unauthorized- No TOken FOund",
      });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        message: "Unauthorized- Invalid Token",
      });
    }
    const user = await db.User.findUnique({
      where: {
        id: decoded.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });
    if (!user) {
      return res.status(401).json({
        message: " User Not Found",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in authMiddleware", error);
    res.status(500).json({
      message: "Error in authenticating user",
    });
  }
};
