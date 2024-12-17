module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        'plugin:jest/recommended'
    ],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module'
    },
    plugins: [
        'jest'
    ],
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error',
        'max-len': ['error', { 
            'code': 100,
            'ignoreComments': true,
            'ignoreUrls': true,
            'ignoreStrings': true,
            'ignoreTemplateLiterals': true
        }],
        'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 1 }],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'comma-dangle': ['error', {
            'arrays': 'always-multiline',
            'objects': 'always-multiline',
            'imports': 'always-multiline',
            'exports': 'always-multiline',
            'functions': 'never'
        }],
        'arrow-parens': ['error', 'always'],
        'arrow-spacing': ['error', { 'before': true, 'after': true }],
        'block-spacing': ['error', 'always'],
        'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
        'camelcase': ['error', { 'properties': 'never' }],
        'comma-spacing': ['error', { 'before': false, 'after': true }],
        'eol-last': ['error', 'always'],
        'func-call-spacing': ['error', 'never'],
        'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
        'keyword-spacing': ['error', { 'before': true, 'after': true }],
        'no-trailing-spaces': 'error',
        'padded-blocks': ['error', 'never'],
        'space-before-blocks': ['error', 'always'],
        'space-before-function-paren': ['error', {
            'anonymous': 'always',
            'named': 'never',
            'asyncArrow': 'always'
        }],
        'space-in-parens': ['error', 'never'],
        'space-infix-ops': 'error',
        'spaced-comment': ['error', 'always', { 'exceptions': ['-', '+'] }],
        'no-var': 'error',
        'prefer-const': 'error',
        'no-duplicate-imports': 'error',
        'no-useless-constructor': 'error',
        'no-useless-rename': 'error',
        'no-useless-return': 'error',
        'prefer-template': 'error',
        'template-curly-spacing': ['error', 'never'],
        'prefer-destructuring': ['error', {
            'array': true,
            'object': true
        }, {
            'enforceForRenamedProperties': false
        }],
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'rest-spread-spacing': ['error', 'never'],
        'no-param-reassign': ['error', { 'props': false }],
        'no-use-before-define': ['error', { 'functions': false, 'classes': true }],
        'complexity': ['warn', 20],
        'max-depth': ['warn', 4],
        'max-nested-callbacks': ['warn', 3],
        'max-params': ['warn', 4]
    },
    overrides: [
        {
            files: ['tests/**/*.js', '**/*.test.js'],
            rules: {
                'max-len': 'off',
                'max-nested-callbacks': 'off',
                'max-params': 'off'
            }
        }
    ]
};
