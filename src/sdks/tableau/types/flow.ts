import { z } from 'zod';

import { projectSchema } from './project.js';
import { tagsSchema } from './tags.js';

/**
 * Subset of Tableau REST API flow resource.
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
});

export type Flow = z.infer<typeof flowSchema>;
