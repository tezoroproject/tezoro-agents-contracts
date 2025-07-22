import { CodegenConfig } from "@graphql-codegen/cli";
import { GRAPHQL_API_URL } from "./global-constants";

const config: CodegenConfig = {
  schema: GRAPHQL_API_URL,
  documents: ["src/**/*.graphql"],
  generates: {
    "./src/gql/index.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-graphql-request",
      ],
    },
  },
};

export default config;
