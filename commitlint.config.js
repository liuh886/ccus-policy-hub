export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['data', 'gov', 'ui', 'core', 'deps', 'content', 'docs', 'fix', 'feat']
    ],
  },
};