import express from "express";
import authRouter from "./routes/authRoutes.js";
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  const ip = req.ip;
  res.send(`client ip:${ip}`);
});

app.use("/auth", authRouter);

app.listen(8800, (err) => {
  if (err) console.log(err.message);
  console.log("server is running on port : 8800");
});
