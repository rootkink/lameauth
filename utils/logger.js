// logger.js
import pino from "pino";

const logger = pino({
  level: "trace", // logs EVERYTHING: trace, debug, info, warn, error, fatal
  transport: {
    target: "pino-pretty", // optional: makes output readable in terminal
    options: {
      colorize: true,
      translateTime: true,
    },
  },
});

export default logger;
