/** @type {import('svgo').Config} */
module.exports = {
  plugins: [
    {
      name: "preset-default",
      params: { overrides: { removeViewBox: false } },
    },
    "removeDimensions",
  ],
};
