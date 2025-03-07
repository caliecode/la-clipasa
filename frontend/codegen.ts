import { type CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: '../internal/gql/schema/*.graphql',
  documents: ['src/graphql/queries/*.{ts,graphql}'],
  ignoreNoDocuments: true,
  hooks: { afterAllFileWrite: ['prettier --write '] },
  generates: {
    './src/graphql/gen.tsx': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-urql',
        {
          add: {
            content: '/* eslint-disable react-refresh/only-export-components */',
          },
        },
      ],

      config: {
        withComponent: true,
        withHOC: true,
        withHooks: true,
        enumsAsTypes: true,
        flattenGeneratedTypes: true,
        skipDocumentsValidation: true,
        flattenGeneratedTypesIncludeFragments: true,
      },
    },
  },
}

export default config
