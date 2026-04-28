import { z } from 'zod';

/**
 * Tableau REST API Extract Refresh Task resource.
 *
 * Represents a scheduled extract refresh configured against either a workbook or
 * a datasource. Tasks are exposed via the Tasks endpoint family and can be
 * executed on-demand via the Run Extract Refresh Task Now endpoint.
 *
 * @see https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#get_extract_refresh_tasks
 */
export const extractRefreshTaskSchema = z.object({
  id: z.string(),
  // "FullRefresh" or "IncrementalRefresh"
  type: z.string().optional(),
  priority: z.coerce.number().optional(),
  consecutiveFailedCount: z.coerce.number().optional(),
  schedule: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      state: z.string().optional(),
      priority: z.coerce.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      frequency: z.string().optional(),
      nextRunAt: z.string().optional(),
    })
    .optional(),
  workbook: z
    .object({
      id: z.string(),
    })
    .optional(),
  datasource: z
    .object({
      id: z.string(),
    })
    .optional(),
});

export type ExtractRefreshTask = z.infer<typeof extractRefreshTaskSchema>;
