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

// ---------------------------------------------------------------------------
// Schedule creation request
// ---------------------------------------------------------------------------

/**
 * Time-of-day string accepted by Tableau's schedule frequencyDetails.
 *
 * Tableau accepts HH:MM:SS (24-hour). We validate the shape here so malformed
 * inputs fail fast before hitting the backend.
 */
const timeOfDaySchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
    'Must be a 24-hour time in the form HH:MM:SS (e.g. 03:00:00)',
  );

export const scheduleTypeEnum = ['Extract', 'Subscription', 'Flow'] as const;
export const executionOrderEnum = ['Parallel', 'Serial'] as const;
export const weekDayEnum = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Day-of-month value accepted by Tableau's monthly schedule intervals.
 * Tableau accepts "1" through "31" or the literal string "LastDay".
 */
const monthDaySchema = z
  .string()
  .regex(
    /^([1-9]|[12]\d|3[01]|LastDay)$/,
    'Must be a day-of-month "1"-"31" or the literal "LastDay"',
  );

const hourlyIntervalSchema = z.object({
  // Tableau accepts either hours or minutes per interval, not both.
  hours: z.enum(['1', '2', '4', '6', '8', '12']).optional(),
  minutes: z.enum(['15', '30', '60']).optional(),
});

const hourlyFrequencyDetailsSchema = z.object({
  frequency: z.literal('Hourly'),
  start: timeOfDaySchema.describe('Start time (HH:MM:SS)'),
  end: timeOfDaySchema.describe('End time (HH:MM:SS). Required for hourly schedules.'),
  intervals: z
    .array(hourlyIntervalSchema)
    .min(1)
    .describe('Intervals with either `hours` or `minutes` specifying cadence within the window.'),
});

const dailyFrequencyDetailsSchema = z.object({
  frequency: z.literal('Daily'),
  start: timeOfDaySchema.describe('Run time (HH:MM:SS) at which the schedule fires each day.'),
});

const weeklyIntervalSchema = z.object({
  weekDay: z.enum(weekDayEnum),
});

const weeklyFrequencyDetailsSchema = z.object({
  frequency: z.literal('Weekly'),
  start: timeOfDaySchema.describe('Run time (HH:MM:SS) on each scheduled day.'),
  intervals: z.array(weeklyIntervalSchema).min(1).describe('One or more week-day entries.'),
});

const monthlyIntervalSchema = z.object({
  monthDay: monthDaySchema,
});

const monthlyFrequencyDetailsSchema = z.object({
  frequency: z.literal('Monthly'),
  start: timeOfDaySchema.describe('Run time (HH:MM:SS) on the scheduled day each month.'),
  intervals: z
    .array(monthlyIntervalSchema)
    .min(1)
    .describe('One or more day-of-month entries. Use "LastDay" for end-of-month.'),
});

/**
 * Discriminated-union frequency specification for schedule creation.
 *
 * Tableau's `frequencyDetails` XML shape varies by frequency; this schema makes
 * the conditional structure explicit and validates it before calling the API.
 */
export const scheduleFrequencyDetailsSchema = z.discriminatedUnion('frequency', [
  hourlyFrequencyDetailsSchema,
  dailyFrequencyDetailsSchema,
  weeklyFrequencyDetailsSchema,
  monthlyFrequencyDetailsSchema,
]);

export type ScheduleFrequencyDetails = z.infer<typeof scheduleFrequencyDetailsSchema>;

/**
 * Input schema for the create-schedule tool.
 */
export const createScheduleInputSchema = z.object({
  name: z.string().min(1).describe('Name for the new schedule.'),
  type: z
    .enum(scheduleTypeEnum)
    .describe('What this schedule drives: Extract, Subscription, or Flow.'),
  frequencyDetails: scheduleFrequencyDetailsSchema,
  priority: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Priority 1-100. Lower numbers run first. Defaults server-side (typically 50).'),
  executionOrder: z
    .enum(executionOrderEnum)
    .optional()
    .describe(
      'Whether tasks on this schedule run in Parallel or Serial. Defaults server-side (typically Parallel).',
    ),
});

export type CreateScheduleInput = z.infer<typeof createScheduleInputSchema>;

/**
 * Body sent to POST /sites/{site-id}/schedules (wire format).
 *
 * Tableau's REST API accepts this nested-object shape. `frequencyDetails.intervals`
 * is passed as `frequencyDetails.intervals.interval` — the API historically uses
 * singular element names inside plural containers. We build this wire body from
 * the {@link CreateScheduleInput} inside the schedule method.
 */
export const createScheduleRequestBodySchema = z.object({
  schedule: z.object({
    name: z.string(),
    type: z.enum(scheduleTypeEnum),
    frequency: z.enum(['Hourly', 'Daily', 'Weekly', 'Monthly']),
    priority: z.number().int().min(1).max(100).optional(),
    executionOrder: z.enum(executionOrderEnum).optional(),
    frequencyDetails: z.object({
      start: z.string(),
      end: z.string().optional(),
      intervals: z.object({
        interval: z.array(
          z.object({
            hours: z.string().optional(),
            minutes: z.string().optional(),
            weekDay: z.enum(weekDayEnum).optional(),
            monthDay: z.string().optional(),
          }),
        ),
      }),
    }),
  }),
});

export type CreateScheduleRequestBody = z.infer<typeof createScheduleRequestBodySchema>;
