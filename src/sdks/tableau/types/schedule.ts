import { z } from 'zod';

/**
 * Tableau REST API Schedule resource (partial).
 *
 * Represents a schedule on either Tableau Server or Tableau Cloud. The REST API
 * returns a richer structure (including `frequencyDetails` with `intervalItems`)
 * that we intentionally do not model in detail here: the bulk of callers of
 * `list-schedules` just need identifying metadata plus the headline
 * frequency/state, and the shape of `frequencyDetails` varies across Server and
 * Cloud. Consumers who need the full raw structure can fall back to Tableau's
 * REST API directly.
 *
 * @see https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#list_schedules
 */
export const scheduleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  // "Active" | "Suspended"
  state: z.string().optional(),
  priority: z.coerce.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  // "Hourly" | "Daily" | "Weekly" | "Monthly"
  frequency: z.string().optional(),
  nextRunAt: z.string().optional(),
  endScheduleAt: z.string().optional(),
  // "Parallel" | "Serial"
  executionOrder: z.string().optional(),
  // "Extract" | "Subscription" | "Flow"
  type: z.string().optional(),
});

export type Schedule = z.infer<typeof scheduleSchema>;
