import { getConfig } from './src/config/environment';

export default {
  API_BASE_URL: getConfig('API_BASE_URL'),
  endpoints: {
    auth: {
      checkEmail: '/auth/check-email',
      sendCode: '/auth/send-code',
      confirmPassword: '/auth/confirm-password',
      login: '/auth/login',
      logout: '/auth/logout',
      me: '/auth/me',
      meCentrals: '/auth/me/centrals'
    },
    volumeVerifications: '/volume-verifications',
    youtube: {
      upload: '/youtube/upload'
    }
  }
};
