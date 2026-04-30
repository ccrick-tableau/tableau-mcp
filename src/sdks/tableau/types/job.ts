import { z } from 'zod';

/**
 * Tableau REST API Job resource.
 *
 * Jobs are returned by asynchronous operations (Run Flow Now, Run Extract Refresh Task,
 * etc.) and by the Query Job endpoint. A job may be in progress, finished, or failed;
 * the `finishCode` field is only meaningful once the job has completed.
 *
 * finishCode values:
 *   - "0" — success
 *   - "1" — failed
 *   - "2" — cancelled
 *
 * Not all fields are present at all times: e.g. `startedAt` / `completedAt` only
 * appear once the job has actually started or finished.
 *
 * @see https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#query_job
 */
export const jobSchema = z.object({
  id: z.string(),
  mode: z.string().optional(),
  type: z.string().optional(),
  progress: z.string().optional(),
  createdAt: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  finishCode: z.string().optional(),
  notes: z.string().optional(),
  // Job-type-specific sub-resources. Kept as passthrough objects so we don't
  // couple the shared Job schema to every possible job variant's full shape.
  extractRefreshJob: z.record(z.unknown()).optional(),
  flowRun: z.record(z.unknown()).optional(),
  runFlowJobType: z.record(z.unknown()).optional(),
  statusNotes: z
    .object({
      statusNote: z.array(z.record(z.unknown())).optional(),
    })
    .optional(),
});

export type Job = z.infer<typeof jobSchema>;
