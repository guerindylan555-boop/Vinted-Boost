module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['expo', { reanimated: false }],
      'nativewind/babel', // NativeWind v4 exports a preset (not a plugin)
    ],
    plugins: [],
  };
};
