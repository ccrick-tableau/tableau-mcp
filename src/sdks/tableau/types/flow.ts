import { z } from 'zod';

import { flowConnectionSchema } from './flowConnection.js';
import { flowRunSchema } from './flowRun.js';
import { projectSchema } from './project.js';
import { tagsSchema } from './tags.js';

/**
 * Subset of Tableau REST API flow resource.
 *
 * The base fields mirror the `GET /sites/{site-id}/flows/{flow-id}` response.
 * `flowRuns` and `connections` are attached by the `get-flow` tool when the
 * caller requests enrichment (default on); they are not part of the raw
 * Tableau flow resource and will be absent from `list-flows` results.
 *
 * @see https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#query_flow
 */
export const flowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  webpageUrl: z.string().optional(),
  fileType: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  project: projectSchema.optional(),
  owner: z
    .object({
      id: z.string(),
      name: z.string().optional(),
    })
    .optional(),
  tags: tagsSchema,
  // Enrichments attached by the `get-flow` tool. Absent when the tool's
  // corresponding `include*` flag is false, or when the data is fetched via
  // endpoints that do not supply these fields (e.g. `list-flows`).
  flowRuns: z.array(flowRunSchema).optional(),
  connections: z.array(flowConnectionSchema).optional(),
});

export type Flow = z.infer<typeof flowSchema>;
