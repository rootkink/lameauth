import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Use __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import jwt from "jsonwebtoken";
import Logger from "../utils/logger.js";

const logger = Logger.child({ module: "AuthService" });

export class AuthService {
  constructor(userServices, passwordServices) {
    ((this.UserServices = userServices),
      (this.PasswordServices = passwordServices));
  }

  /**
   * Registers a new user after validating and hashing the password.
   *
   * @async
   * @param {Object} user - The user information.
   * @param {string} user.email - The user's email address.
   * @param {string} user.username - The user's username.
   * @param {string} user.password - The user's plain text password.
   * @returns {Promise<Object>} The result of the registration attempt.
   * @returns {boolean} return.success - Whether the registration was successful.
   * @returns {string} return.message - A descriptive message about the result.
   * @returns {Object} [return.user] - The created user object (only if successful).
   * @returns {string} return.user.id - The new user's ID.
   * @returns {string} return.user.username - The new user's username.
   * @returns {string} return.user.email - The new user's email.
   * @returns {string} return.user.created_at - Timestamp of user creation.
   * @returns {string} return.user.updated_at - Timestamp of last update.
   */

  async register(user) {
    const { success: isValid } = this.PasswordServices.validate(user.password);
    try {
      if (!isValid) throw new Error("invalid password");
      const hashedPassword = await this.PasswordServices.hash(user.password);
      const createdUser = await this.UserServices.createUser({
        email: user.email,
        username: user.username,
        password: hashedPassword,
      });
      logger.info("User registered successfully");
      return {
        success: true,
        message: " user registered successfully",
        user: {
          id: createdUser.id,
          username: createdUser.username,
          email: createdUser.email,
          created_at: createdUser.created_at,
          updated_at: createdUser.updated_at,
        },
      };
    } catch (err) {
      logger.error("registration error :" + err.message);
      return {
        success: false,
        message: "failed to register user",
      };
    }
  }

  /**
   * Authenticates a user by verifying credentials.
   *
   * @async
   * @param {Object} user - The login credentials.
   * @param {string} user.username - The user's username.
   * @param {string} user.password - The user's plain text password. (atleast 8 character)
   * @returns {Promise<Object>} The result of the login attempt.
   * @returns {boolean} return.success - Whether the login was successful.
   * @returns {string} return.message - A descriptive message about the result.
   * @returns {Object} [return.user] - The authenticated user data (if successful).
   * @returns {string} return.user.id - The user's unique ID.
   * @returns {string} return.user.username - The user's username.
   * @returns {string} return.user.email - The user's email.
   * @returns {string} return.user.created_at - Timestamp of account creation.
   * @returns {string} return.user.updated_at - Timestamp of last account update.
   *
   */

  async authenticate(user) {
    try {
      if (!user?.username || !user?.password) {
        throw new Error("Username and password are required");
      }
      const username = user.username.trim();
      const password = user.password.trim();
      const { user: userFound, success } =
        await this.UserServices.findUser(username);
      if (!success) {
        logger.warn(`Login attempt for non-existent user: ${username}`);
        throw new Error("Invalid Credentials");
      }
      const isValid = await this.PasswordServices.compare(
        password,
        userFound.password,
      );
      if (!isValid) {
        logger.warn(`Invalid password attempt for user: ${username}`);
        const currentAttempts = userFound.login_attempts || 0;
        await this.UserServices.updateUser(userFound.id, {
          login_attempts: currentAttempts + 1,
        });
        if (userFound.login_attempts === 5) {
          throw new Error("Too many login attempts, please try again later");
        }
        throw new Error("Invalid Credentials");
      }
      await this.UserServices.updateUser(userFound.id, {
        login_attempts: 0,
      });

      return {
        success: true,
        message: "User logged in successfully",
        user: {
          id: userFound.id,
          username: userFound.username,
          email: userFound.email,
          created_at: userFound.created_at,
          updated_at: userFound.updated_at,
        },
      };
    } catch (err) {
      logger.error(`Login error: ${err}`);
      return {
        success: false,
        message: "User login failed",
      };
    }
  }

  /**
   * Authenticates a user and returns a login response with a signed access token.
   *
   * @async
   * @param {Object} userData - The user's login credentials.
   * @param {string} userData.username - The username of the user.
   * @param {string} userData.password - The user's plain text password.
   * @returns {Promise<Object|undefined>} A response object containing user info and JWT token,
   *   or `undefined` if authentication fails.
   *
   * @property {boolean} success - Whether the login was successful.
   * @property {Object} user - The authenticated user object.
   * @property {string} token - The signed JWT access token.
   * @property {string} message - A message describing the result.
   *
   * @throws {Error} Propagates any error thrown by `authenticate()` or `generateJwt()`.
   */

  // TODO: Generate a refresh token alongside the access token
  // TODO: Add a `tokens` array to the User model to store active tokens
  // TODO: Set `expiresIn` on access token (e.g., { expiresIn: "15m" })
  // TODO: Implement token revocation and cleanup of expired tokens

  async login(userData) {
    const { success, user } = await this.authenticate(userData);
    if (success) {
      const accessToken = this.generateJwt(user.username);
      return {
        success: true,
        user: user,
        token: accessToken,
        message: "user logged in",
      };
    }
  }

  /**
   * Generates a JSON Web Token (JWT) for the given payload using the secret key.
   *
   * @param {string|object|Buffer} payload - The payload to encode into the JWT.
   *   Typically includes user-identifying information like a username or ID.
   * @returns {string} The signed JWT as a string.
   * @throws {Error} If the ACCESS_SECRET_TOKEN environment variable is not set.
   */

  generate(payload, secret) {
    if (!secret) {
      throw new Error("SECRET_TOKEN is missing or undefined");
    }
    return jwt.sign(payload, process.env.ACCESS_SECRET_TOKEN, {
      expiresIn: "30s",
    });
  }
}

import { UserServices, UserRepository } from "../service/userService.js";
import { PasswordServices } from "../service/passwordService.js";

const userRepository = new UserRepository("../model/users.json");
const userServices = new UserServices(userRepository);
const passwordServices = new PasswordServices();

// (async () => {
//   const as = new AuthService(userServices, passwordServices);
//   // as.register({
//   //   email: "ayush@example.com",
//   //   password: "12345678",
//   //   username: "ayush",
//   // });
//   const data = await as.login({ username: "ayush", password: "12345678" });
//   console.log(data);
// })();
