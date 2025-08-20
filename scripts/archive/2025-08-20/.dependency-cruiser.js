module.exports = {
  options: {
    outputType: 'mermaid',
    prefix: '',
    includeOnly: '^(client/src|server/src)',
    exclude: {
      path: 'node_modules|test|spec|.test|.spec|stories',
    },
    maxDepth: 3,
    progress: { type: 'none' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.all.json',
    },
  },
};