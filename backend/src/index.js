import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./Routes/auth.route.js";

dotenv.config();

const Port = process.env.PORT ?? 8000;

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: " Hello  buddy",
  });
});

app.use("/api/v1/auth", authRoutes);

app.listen(Port, () => {
  console.log(`sever is running on ${Port}`);
});
