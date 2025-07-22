import { GraphQLClient } from "graphql-request";
import { getSdk } from "../../gql";
import { GRAPHQL_API_URL } from "../../../global-constants";

export const graphQLClient = new GraphQLClient(GRAPHQL_API_URL);
export const indexerSDK = getSdk(graphQLClient);
