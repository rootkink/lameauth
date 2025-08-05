import bcrypt from "bcrypt";
import Logger from "../utils/logger.js";

const logger = Logger.child({ module: "PasswordService" });

export class PasswordServices {
  constructor(repository) {
    this.repository = repository;
  }

  async compare(password, hashedPassword) {
    if (!password || !hashedPassword) {
      logger.error("password or hashedPassword is empty");
      throw new Error("password and hash arguments required");
    }
    return await bcrypt.compare(password, hashedPassword);
    a;
  }

  strength(password) {
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password);
    let N = 0;
    if (hasDigit) N += 10;
    if (hasLower) N += 26;
    if (hasUpper) N += 26;
    if (hasSpecial) N += 32;
    const E = password.length * Math.log2(N);
    let level = "Very Weak";
    if (E >= 128) level = "Very Strong";
    else if (E >= 60) level = "Strong";
    else if (E >= 49) level = "Reasonable";
    else if (E >= 28) level = "Weak";
    else if (E >= 0) level = "Poor";
    return { entropy: E.toFixed(2), level };
  }

  validate(password) {
    if (password.length < 8) {
      logger.error("Password is too short");
      return {
        success: false,
        message: "Password is too short",
      };
    }
    const buf = Buffer.from(password, "utf8");
    console.log(buf.length);
    if (buf.length > 72) {
      logger.error("Password is too long");
      return {
        success: false,
        message: "Password is too long",
      };
    }
    logger.info("Password is valid");
    return {
      success: true,
      message: "Password is valid",
    };
  }

  /*
   * NOTE : @password_history : Array
   */

  isUsed(password, password_history) {
    return password_history.some((hashedPassword) => {
      return this.compare(password, hashedPassword);
    });
  }

  async hash(password) {
    // NOTE : @saltRound = 10 or 12 (must)
    const saltRound = 4;
    try {
      const salt = bcrypt.genSaltSync(saltRound);
      const hash = bcrypt.hashSync(password, salt);
      return hash;
    } catch (err) {
      logger.error(err.message);
      return null;
    }
  }
}
