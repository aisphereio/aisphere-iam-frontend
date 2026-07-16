import { defineConfig } from 'orval';

export default defineConfig({
  iam: {
    input: {
      target: './openapi/aisphere.swagger.json',
    },
    output: {
      target: './src/lib/api/generated/iam.ts',
      schemas: './src/lib/api/generated/model',
      client: 'fetch',
      mode: 'tags-split',
      clean: true,
      urlEncodeParameters: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: './src/lib/api/iam-fetch.ts',
          name: 'iamFetch',
        },
      },
    },
  },
});
