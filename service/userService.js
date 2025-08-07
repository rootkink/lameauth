import bcrypt from "bcrypt";
import crypto from "crypto";
import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Logger from "../utils/logger.js";

const logger = Logger.child({ module: "UserService" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class UserRepository {
  constructor(filePath) {
    this.filePath = path.resolve(__dirname, filePath);
  }
  async readAll() {
    try {
      const data = await fsp.readFile(this.filePath);
      return await JSON.parse(data).map(User.deserialize);
    } catch (err) {
      logger.error(err.message);
      if (err.code === "ENOENT") {
        return [];
      }
      throw new Error(`failed to read users: ${err.message}`);
    }
  }
  async saveAll(users) {
    try {
      if (!Array.isArray(users)) {
        throw new Error(`Users must be array`);
      }
      const serialized = users.map((user) => user.serialize());
      await fsp.writeFile(this.filePath, JSON.stringify(serialized, null, 2));
    } catch (err) {
      logger.error(err.message);
      throw new Error(`Failed to save users: ${err.message}`);
    }
  }
}

export class UserServices {
  constructor(repository) {
    this.repository = repository;
  }

  async createUser({ email, username, password }) {
    try {
      const users = await this.repository.readAll();
      const emailExists = users.find((user) => user.email === email);
      const usernameExists = users.find((user) => user.username === username);
      if (emailExists) throw new Error("Email already exists");
      if (usernameExists) throw new Error("Username already exists");
      const id = crypto.randomUUID();
      const createdAt = new Date();
      const updatedAt = new Date();
      const newUser = new User({
        id,
        email,
        username,
        password,
        createdAt,
        updatedAt,
      });
      users.push(newUser);
      await this.repository.saveAll(users);
      return {
        sucess: true,
        user: newUser,
      };
    } catch (err) {
      logger.error(err);
      return {
        sucess: false,
        error: `Failed to create user`,
      };
    }
  }

  async updateUser(id, updates) {
    const users = await this.repository.readAll();
    const idx = users.findIndex((user) => user.id === id);
    if (idx === -1) {
      throw new Error(`User with id ${id} not found`);
    }
    try {
      if (updates.username != undefined) users[idx].username = updates.username;
      if (updates.password != undefined) {
        users[idx].password_history.unshift(updates.password);
        users[idx].password_history = users[idx].password_history.slice(0, 5);
        users[idx].password = updates.password;
      }
      if (updates.email != undefined) users[idx].email = updates.email;
      if (updates.login_attempts != undefined)
        users[idx].login_attempts = updates.login_attempts;
      users[idx].updated_at = new Date();
      await this.repository.saveAll(users);
      logger.info(`User updated`, users[idx]);
      return {
        sucess: true,
        user: users[idx],
      };
    } catch (err) {
      logger.error(err);
      return {
        sucess: false,
        error: `Failed to update user`,
      };
    }
  }

  async findUser(username) {
    const users = await this.repository.readAll();
    try {
      const userExists = users.find((user) => user.username === username);
      if (!userExists) {
        logger.warn(`User with username ${username} not found`);
        return null;
      }
      logger.info(`User found`, userExists);
      return {
        success: true,
        message: "User exists",
        user: userExists,
      };
    } catch (err) {
      logger.error(err);
      return {
        success: false,
        message: "User does not exist",
      };
    }
  }
}

class User {
  constructor({
    id,
    email,
    username,
    password,
    createdAt,
    updatedAt,
    oldPassword,
    loginAttempts,
  }) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.password = password;
    this.created_at = createdAt;
    this.updated_at = updatedAt;
    this.password_history = oldPassword;
    this.login_attempts = loginAttempts ?? 0;
  }

  serialize() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      password: this.password,
      created_at: this.created_at,
      updated_at: this.updated_at,
      password_history: this.password_history || [],
      login_attempts: this.login_attempts,
    };
  }

  static deserialize(user) {
    return new User({
      id: user.id,
      email: user.email,
      username: user.username,
      password: user.password,
      oldPassword: user.password_history,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      loginAttempts: user.login_attempts,
    });
  }
}
