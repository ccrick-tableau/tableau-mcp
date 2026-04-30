import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';

import { useRestApi } from '../../restApiInstance.js';
import { createScheduleInputSchema, Schedule } from '../../sdks/tableau/types/schedule.js';
import { Server } from '../../server.js';
import { Tool } from '../tool.js';

// Tool param schemas are ZodRawShape objects; unpack the fields of the input schema
// so they register as individual MCP tool parameters.
const paramsSchema = createScheduleInputSchema.shape;

/**
 * Tool that creates a new Tableau schedule.
 *
 * Design notes:
 * - Uses the site-scoped `POST /sites/{site-id}/schedules` endpoint, which is
 *   supported on both Tableau Cloud and Tableau Server. Requires site-admin
 *   (Cloud) or server-admin (Server) privileges; permission failures surface
 *   as HTTP 403 from Tableau.
 * - Tableau's `frequencyDetails` shape varies by frequency. The tool input uses
 *   a discriminated union (see `scheduleFrequencyDetailsSchema`) so agents see
 *   a validated conditional structure, and the wire body is built inside the
 *   schedules method. See the Run Flow / Run Extract Refresh tools for the
 *   matching pattern of "validated at the tool boundary, wire-formatted at the
 *   SDK boundary."
 * - Not idempotent: two calls with identical inputs create two distinct
 *   schedules. Agents that want at-most-once semantics should first call
 *   `list-schedules` with a name filter.
 * - No BoundedContext gating: schedules aren't project- or tag-scoped resources.
 */
export const getCreateScheduleTool = (server: Server): Tool<typeof paramsSchema> => {
  const createScheduleTool = new Tool({
    server,
    name: 'create-schedule',
    description: `
  Creates a new schedule on the Tableau site. Returns the created schedule, including its server-assigned \`id\`.

  **Requires admin privileges.** On Tableau Cloud this is a site-admin operation; on Tableau Server a server-admin operation. Non-admin callers will receive HTTP 403 from Tableau.

  **Frequency structure**

  The \`frequencyDetails\` argument is a discriminated union keyed on \`frequency\`:

  - \`Hourly\`: requires \`start\`, \`end\`, and one or more \`intervals\` each with \`hours\` (one of "1","2","4","6","8","12") or \`minutes\` ("15","30","60").
  - \`Daily\`: requires only \`start\` (HH:MM:SS).
  - \`Weekly\`: requires \`start\` and one or more \`intervals\` with a \`weekDay\` (Sunday..Saturday).
  - \`Monthly\`: requires \`start\` and one or more \`intervals\` with a \`monthDay\` ("1".."31" or "LastDay").

  **When to use**
  - Creating a recurring backgrounder cadence for extract refreshes, flow runs, or subscription deliveries.
  - Provisioning scheduled windows during site setup or environment migration.

  **Side effects**
  - Adds a schedule resource on the site. Future tasks bound to this schedule will run at the specified cadence.
  - Re-running the tool with the same inputs creates a **new** schedule; it does not deduplicate.

  **Example: daily schedule at 03:00**
  \`\`\`
  {
    "name": "Nightly Extracts",
    "type": "Extract",
    "frequencyDetails": { "frequency": "Daily", "start": "03:00:00" }
  }
  \`\`\`

  **Example: hourly, every 2 hours between 08:00 and 20:00**
  \`\`\`
  {
    "name": "Business Hours Hourly",
    "type": "Extract",
    "frequencyDetails": {
      "frequency": "Hourly",
      "start": "08:00:00",
      "end": "20:00:00",
      "intervals": [{ "hours": "2" }]
    }
  }
  \`\`\`

  **Example: weekly on Mon/Wed/Fri at 06:30**
  \`\`\`
  {
    "name": "MWF Flows",
    "type": "Flow",
    "frequencyDetails": {
      "frequency": "Weekly",
      "start": "06:30:00",
      "intervals": [
        { "weekDay": "Monday" },
        { "weekDay": "Wednesday" },
        { "weekDay": "Friday" }
      ]
    }
  }
  \`\`\`

  **Example: monthly on the last day at 23:00**
  \`\`\`
  {
    "name": "Month End Subs",
    "type": "Subscription",
    "frequencyDetails": {
      "frequency": "Monthly",
      "start": "23:00:00",
      "intervals": [{ "monthDay": "LastDay" }]
    }
  }
  \`\`\``,
    paramsSchema,
    annotations: {
      title: 'Create Schedule',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    callback: async (args, extra): Promise<CallToolResult> => {
      return await createScheduleTool.logAndExecute<Schedule>({
        extra,
        args,
        callback: async () => {
          // `args` is already validated against paramsSchema by the MCP server,
          // but we re-parse through the full input schema to materialize the
          // discriminated-union type narrowing for the SDK call. A parse
          // failure here throws a ZodError which logAndExecute converts into
          // an error CallToolResult.
          const input = createScheduleInputSchema.parse(args);

          return new Ok(
            await useRestApi({
              ...extra,
              jwtScopes: createScheduleTool.requiredApiScopes,
              callback: async (restApi) => {
                return await restApi.schedulesMethods.createSchedule({
                  siteId: restApi.siteId,
                  input,
                });
              },
            }),
          );
        },
        constrainSuccessResult: (schedule) => ({ type: 'success', result: schedule }),
      });
    },
  });

  return createScheduleTool;
};
