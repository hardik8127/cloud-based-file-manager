import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./Routes/auth.route.js";
import fileRoutes from "./Routes/file.route.js";
import folderRoutes from "./Routes/folder.route.js";

dotenv.config();

const Port = process.env.PORT ?? 8000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: " Hello  buddy",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1/folder", folderRoutes);

app.listen(Port, () => {
  console.log(`sever is running on ${Port}`);
});
