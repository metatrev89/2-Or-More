module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // babel-preset-expo auto-configures the reanimated/worklets plugin —
    // no manual plugin entry (the old 'react-native-reanimated/plugin' is v3-era).
  };
};
