import { z } from 'zod';

/**
 * Tableau REST API Flow Run resource.
 *
 * Represents a single historical execution of a flow. Returned by the
 * `GET /sites/{site-id}/flows/{flow-id}/runs` endpoint.
 *
 * `status` values observed in practice:
 *   - "Success"
 *   - "Failed"
 *   - "Cancelled"
 *   - "InProgress"
 *   - "Pending"
 *
 * `backgroundJobId` links a completed (or in-flight) run to the async Job
 * resource returned by `run-flow` and readable via `get-job`.
 *
 * @see https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#get_flow_runs
 */
export const flowRunSchema = z.object({
  id: z.string(),
  flowId: z.string().optional(),
  status: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  progress: z.string().optional(),
  backgroundJobId: z.string().optional(),
});

export type FlowRun = z.infer<typeof flowRunSchema>;
