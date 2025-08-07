import Logger from "../utils/logger.js";
const logger = Logger.child({ module: TokenService });

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

/**
 * @typedef {Object} RefreshToken
 * @property {string} value - The refresh token string
 * @property {string} issuedAt - ISO timestamp of issuance
 * @property {string} expiresAt - ISO timestamp of expiration
 * @property {boolean} revoked - Whether the token is revoked
 * @property {string} ip - IP address from which the token was issued
 * @property {string} userAgent - User agent string of the device/browser
 */

/**
 * @typedef {Object} TokenData
 * @property {string} id - User ID
 * @property {RefreshToken[]} tokens - Array of refresh tokens with metadata
 */

/**
 * Token class representing a user and their tokens.
 */

class Token {
  /**
   * @param {TokenData} data - Token data object
   */

  constructor({ id, username, tokens }) {
    this.id = id;
    this.username = username;
    this.tokens = tokens || [];
  }

  /**
   * Serializes the Token instance into a plain object.
   * @returns {TokenData} - Serialized token data
   */
  serialize() {
    return {
      id: this.id,
      tokens: this.tokens || [],
    };
  }

  /**
   * Deserializes plain object data into a Token instance.
   * @param {TokenData} data - Raw token data
   * @returns {Token} - Token instance
   */
  static deserialize(data) {
    return new Token({
      id: data.id,
      tokens: data.tokens,
    });
  }
}

class TokenService {
  /**
   * Constructor for the TokenService class.
   * @param {TokenRepository} tokenRepository - Repository for managing tokens
   */
  constructor(tokenRepository) {
    this.tokenRepository = tokenRepository;
  }

  /**
   * Insert new refresh token in to token array
   * @param {string} id - User ID
   * @param {RefreshToken} token - Refresh token
   * */
  async insertToken(id, token) {
    const allUserTokens = await this.tokenRepository.readAll();
    const user = allUserTokens.find((user) => user.id === id);
    if (!user) {
      logger.error("User with this id does not exist");
      throw new Error("User with this id does not exist");
    }
    user.tokens.push(token);
    await this.tokenRepository.saveAll(allUserTokens);
    logger.info("New refresh token added successfully");
  }

  async createToken({id : })
}

/**
 * Repository class for managing tokens in a JSON file.
 */
export class TokenRepository {
  /**
   * Constructs the TokenRepository.
   * @param {string} filePath - Relative path to the JSON file storing the tokens.
   */
  constructor(filePath) {
    this.filePath = path.resolve(__dirname, filePath);
  }
  /**
   * Reads all token entries from the file.
   * @returns {Promise<Token[]>} - Array of Token instances
   * @throws {Error} - On file read or parse error
   */
  async readAll() {
    try {
      const data = await fsp.readFile(this.filePath);
      return await JSON.parse(data).map(Token.deserialize);
    } catch (err) {
      logger.error(err.message);
      if (err.code === "ENOENT") {
        return [];
      }
      throw new Error(`failed to read users: ${err.message}`);
    }
  }

  /**
   * Writes all token entries to the file.
   * @param {Token[]} tokens - Array of Token instances
   * @returns {Promise<void>}
   * @throws {Error} - On file write error or invalid input
   */

  async saveAll(usersToken) {
    try {
      if (!Array.isArray(usersToken)) {
        throw new Error(`Users must be array`);
      }
      const serialized = usersToken.map((token) => token.serialize());
      await fsp.writeFile(this.filePath, JSON.stringify(serialized, null, 2));
    } catch (err) {
      logger.error(err.message);
      throw new Error(`Failed to save users: ${err.message}`);
    }
  }
}
