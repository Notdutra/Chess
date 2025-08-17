// Small logger utility to centralize debug/info/warn/error and provide runtime log-level control
type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const formatArgs = (args: unknown[]) => [`[chess]`, ...args];

const levelPriority: Record<LogLevel, number> = {
  silent: 99,
  error: 40,
  warn: 30,
  info: 20,
  debug: 10,
};

// Default level: prefer explicit LOG_LEVEL, otherwise in production only show errors,
// otherwise default to debug for local development.
let currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "error" : "debug");

const logger = {
  setLevel: (lvl: LogLevel) => {
    currentLevel = lvl;
  },
  getLevel: (): LogLevel => currentLevel,
  debug: (...args: unknown[]) => {
    if (levelPriority[currentLevel] > levelPriority.debug) return;
    // eslint-disable-next-line no-console
    console.debug(...formatArgs(args));
  },
  info: (...args: unknown[]) => {
    if (levelPriority[currentLevel] > levelPriority.info) return;
    // eslint-disable-next-line no-console
    console.info(...formatArgs(args));
  },
  warn: (...args: unknown[]) => {
    if (levelPriority[currentLevel] > levelPriority.warn) return;
    // eslint-disable-next-line no-console
    console.warn(...formatArgs(args));
  },
  error: (...args: unknown[]) => {
    if (levelPriority[currentLevel] > levelPriority.error) return;
    // eslint-disable-next-line no-console
    console.error(...formatArgs(args));
  },
};

export default logger;
