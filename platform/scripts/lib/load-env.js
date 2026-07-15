const path = require('path')
const dotenv = require('dotenv')

const PLATFORM_ENV = path.resolve(__dirname, '..', '..', '.env')
const PLATFORM_API_ENV = path.resolve(__dirname, '..', '..', 'api', '.env')
const LEGACY_API_ENV = path.resolve(__dirname, '..', '..', '..', 'api', '.env')

function loadPlatformEnv() {
  dotenv.config({ path: PLATFORM_ENV })
}

/** Banco e credenciais da API em producao (platform/api/.env). */
function loadPlatformApiEnv() {
  dotenv.config({ path: PLATFORM_API_ENV, override: true })
}

function loadLegacyApiEnv() {
  if (require('fs').existsSync(LEGACY_API_ENV)) {
    dotenv.config({ path: LEGACY_API_ENV, override: true })
  }
}

function loadApiEnv() {
  loadPlatformApiEnv()
}

function loadAllEnv() {
  loadPlatformEnv()
  loadPlatformApiEnv()
}

module.exports = {
  PLATFORM_ENV,
  PLATFORM_API_ENV,
  loadPlatformEnv,
  loadPlatformApiEnv,
  loadLegacyApiEnv,
  loadApiEnv,
  loadAllEnv
}
