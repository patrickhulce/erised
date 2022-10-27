module.exports = {
  transform: {
    '^.+\\.tsx?$': '<rootDir>/node_modules/ts-jest',
  },
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
};
