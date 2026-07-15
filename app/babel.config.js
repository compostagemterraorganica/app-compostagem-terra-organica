module.exports = function (api) {
  const appEnv = process.env.APP_ENV || 'development';
  api.cache.using(() => appEnv);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          envName: 'APP_ENV',
          moduleName: '@env',
          path: appEnv === 'production' ? '.env.production' : '.env',
          blocklist: null,
          allowlist: null,
          safe: false,
          allowUndefined: true,
          verbose: false,
        },
      ],
    ],
  };
};
