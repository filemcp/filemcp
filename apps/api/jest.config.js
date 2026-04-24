/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
    '^.+\\.js$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  // These ESM-only packages need to be transformed
  transformIgnorePatterns: [
    '/node_modules/(?!(unified|remark-parse|remark-rehype|rehype-sanitize|rehype-stringify|unist-util-visit|mdast-util-from-markdown|mdast-util-to-hast|hast-util-to-html|micromark|decode-named-character-reference|character-entities|vfile|vfile-message|@types/hast|@types/mdast|@types/unist|bail|is-plain-obj|trough|zwitch|property-information|space-separated-tokens|comma-separated-tokens|estree-util-attach-comments|estree-util-build-jsx|estree-util-is-identifier-name|estree-util-to-js|estree-walker|periscopic)/)',
  ],
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!main.ts', '!**/*.d.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  // Run serially to avoid DB truncation races between parallel workers
  maxWorkers: 1,
}

module.exports = config
