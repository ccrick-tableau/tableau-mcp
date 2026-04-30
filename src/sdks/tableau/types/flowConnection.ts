import { z } from 'zod';

/**
 * Tableau REST API Connection resource as returned by flow-connection endpoints.
 *
 * Describes an input data source that a flow reads from (e.g. a database,
 * file, or published datasource connection). Field availability depends on
 * connection type; most fields are optional because different connection
 * types populate different subsets.
 *
 * We intentionally keep the schema permissive: Tableau has dozens of
 * connection types and the field matrix varies across them and across
 * versions. Callers that need specific details for a specific type should
 * consult the Tableau REST API directly.
 *
 * @see https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#get_flow_connections
 */
export const flowConnectionSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  serverAddress: z.string().optional(),
  serverPort: z.string().optional(),
  userName: z.string().optional(),
  embedPassword: z.coerce.boolean().optional(),
  queryTaggingEnabled: z.coerce.boolean().optional(),
});

export type FlowConnection = z.infer<typeof flowConnectionSchema>;
