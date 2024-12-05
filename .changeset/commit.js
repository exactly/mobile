/** @type {import('@changesets/types').CommitFunctions} */
module.exports = {
  getVersionMessage: ({ releases }) =>
    Promise.resolve(
      `🔖 release: ${releases
        .map(({ name, newVersion }) => `${name.replace(/^@exactly\//, "")}@${newVersion}`)
        .reverse()
        .join(", ")}`,
    ),
};
