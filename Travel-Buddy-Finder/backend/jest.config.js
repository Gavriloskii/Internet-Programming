module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The root directory that Jest should scan for tests and modules
  rootDir: '.',

  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/tests'],

  // The pattern Jest uses to detect test files
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: ['/node_modules/'],

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/config/',
    '/coverage/'
  ],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['json', 'text', 'lcov', 'clover'],

  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',

  // Setup files after environment is loaded
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },

  // Timeout for each test
  testTimeout: 30000,

  // Load environment variables from .env.test
  setupFiles: ['dotenv/config'],

  // Transform files
  transform: {},

  // Indicates whether each individual test should be reported during the run
  verbose: true
};
