module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
  transform: {
    '^.+\\.tsx?$': ['<rootDir>/node_modules/ts-jest', {diagnostics: false}],
  },
};
