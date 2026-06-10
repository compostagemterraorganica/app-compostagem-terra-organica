const path = require('path')
const dotenv = require('dotenv')

function loadPlatformEnv() {
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') })
}

function loadApiEnv() {
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', 'api', '.env') })
}

function loadAllEnv() {
  loadPlatformEnv()
  loadApiEnv()
}

module.exports = { loadPlatformEnv, loadApiEnv, loadAllEnv }
