import { UserServices, UserRepository } from "../service/userService.js";
import { PasswordServices } from "../service/passwordService.js";
import { AuthService } from "../service/authService.js";

import Logger from "../utils/logger.js";

const logger = Logger.child({ module: "AuthController" });

const userRepository = new UserRepository("../model/users.json");
const userServices = new UserServices(userRepository);
const passwordServices = new PasswordServices();
const authServices = new AuthService(userServices, passwordServices);

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new Error("Username and password are required");
    }
    const result = await authServices.login({ username, password });
    if (!result.success) {
      return res.status(401).json(result); // unauthorized
    }
    console.log("logged in", result);
    return res.status(200).json(result); // successful login
  } catch (err) {
    logger.error("Can't process login request", err);
    console.log(err);
    return res.status(400).json({
      success: false,
      message: "Failed to process login request",
    });
  }
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      throw new Error("Username, email and password are required");
    const result = await authServices.register({ username, email, password });
    res.status(201).json(result);
  } catch (err) {
    logger.error("Can't process register request", err);
    res.status(400).json({
      success: false,
      message: "Failed to process register request",
    });
  }
};

export { register, login };
