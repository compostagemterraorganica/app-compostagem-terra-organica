// Backend API Logger with colors and icons

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

const icons = {
  error: '❌',
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️',
  youtube: '🎥',
  wordpress: '📝',
  auth: '🔐',
  network: '🌐',
  upload: '📤',
  server: '🚀',
  database: '💾',
  user: '👤'
};

class Logger {
  // YouTube logs (Red)
  youtube = {
    info: (message, data = null) => {
      console.log(`${colors.red}${icons.youtube} [YOUTUBE]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    success: (message, data = null) => {
      console.log(`${colors.red}${icons.success}${icons.youtube} [YOUTUBE SUCCESS]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    error: (message, error = null) => {
      console.error(`${colors.red}${colors.bright}${icons.error}${icons.youtube} [YOUTUBE ERROR]${colors.reset} ${colors.red}${message}${colors.reset}`);
      if (error) this._logError(error);
    }
  };

  // WordPress logs (Blue)
  wordpress = {
    info: (message, data = null) => {
      console.log(`${colors.blue}${icons.wordpress} [WORDPRESS]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    success: (message, data = null) => {
      console.log(`${colors.blue}${icons.success}${icons.wordpress} [WORDPRESS SUCCESS]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    error: (message, error = null) => {
      console.error(`${colors.red}${colors.bright}${icons.error}${icons.wordpress} [WORDPRESS ERROR]${colors.reset} ${colors.red}${message}${colors.reset}`);
      if (error) this._logError(error);
    }
  };

  // Authentication logs (Magenta)
  auth = {
    info: (message, data = null) => {
      console.log(`${colors.magenta}${icons.auth} [AUTH]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    success: (message, data = null) => {
      console.log(`${colors.magenta}${icons.success}${icons.auth} [AUTH SUCCESS]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    error: (message, error = null) => {
      console.error(`${colors.red}${colors.bright}${icons.error}${icons.auth} [AUTH ERROR]${colors.reset} ${colors.red}${message}${colors.reset}`);
      if (error) this._logError(error);
    }
  };

  // Network logs (Cyan)
  network = {
    info: (message, data = null) => {
      console.log(`${colors.cyan}${icons.network} [NETWORK]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    success: (message, data = null) => {
      console.log(`${colors.cyan}${icons.success}${icons.network} [NETWORK SUCCESS]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    error: (message, error = null) => {
      console.error(`${colors.red}${colors.bright}${icons.error}${icons.network} [NETWORK ERROR]${colors.reset} ${colors.red}${message}${colors.reset}`);
      if (error) this._logError(error);
    }
  };

  // Upload logs (Green)
  upload = {
    info: (message, data = null) => {
      console.log(`${colors.green}${icons.upload} [UPLOAD]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    success: (message, data = null) => {
      console.log(`${colors.green}${icons.success}${icons.upload} [UPLOAD SUCCESS]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    error: (message, error = null) => {
      console.error(`${colors.red}${colors.bright}${icons.error}${icons.upload} [UPLOAD ERROR]${colors.reset} ${colors.red}${message}${colors.reset}`);
      if (error) this._logError(error);
    }
  };

  // Server logs (Yellow)
  server = {
    info: (message, data = null) => {
      console.log(`${colors.yellow}${icons.server} [SERVER]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    success: (message, data = null) => {
      console.log(`${colors.yellow}${icons.success}${icons.server} [SERVER SUCCESS]${colors.reset} ${message}`);
      if (data) this._logData(data);
    },
    error: (message, error = null) => {
      console.error(`${colors.red}${colors.bright}${icons.error}${icons.server} [SERVER ERROR]${colors.reset} ${colors.red}${message}${colors.reset}`);
      if (error) this._logError(error);
    },
    warning: (message, data = null) => {
      console.warn(`${colors.yellow}${icons.warning} [SERVER WARNING]${colors.reset} ${message}`);
      if (data) this._logData(data);
    }
  };

  // Generic error log
  error = (message, error = null) => {
    console.error(`${colors.red}${colors.bright}${icons.error} [ERROR]${colors.reset} ${colors.red}${message}${colors.reset}`);
    if (error) this._logError(error);
  };

  // Separator for visual organization
  separator = (title = '') => {
    const line = '='.repeat(60);
    if (title) {
      console.log(`${colors.cyan}${line}${colors.reset}`);
      console.log(`${colors.cyan}${colors.bright}${title}${colors.reset}`);
      console.log(`${colors.cyan}${line}${colors.reset}`);
    } else {
      console.log(`${colors.gray}${line}${colors.reset}`);
    }
  };

  // Private helper methods
  _logData(data) {
    if (typeof data === 'object') {
      console.log(`${colors.gray}${JSON.stringify(data, null, 2)}${colors.reset}`);
    } else {
      console.log(`${colors.gray}${data}${colors.reset}`);
    }
  }

  _logError(error) {
    if (error.message) {
      console.error(`${colors.red}  Message: ${error.message}${colors.reset}`);
    }
    if (error.stack) {
      console.error(`${colors.gray}${error.stack}${colors.reset}`);
    }
    if (error.response?.data) {
      console.error(`${colors.red}  Response Data:${colors.reset}`);
      console.error(`${colors.gray}${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
    }
  }
}

module.exports = new Logger();

