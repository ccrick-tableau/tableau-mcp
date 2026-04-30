import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { useRestApi } from '../../restApiInstance.js';
import { Schedule } from '../../sdks/tableau/types/schedule.js';
import { Server } from '../../server.js';
import { paginate } from '../../utils/paginate.js';
import { genericFilterDescription } from '../genericFilterDescription.js';
import { ConstrainedResult, Tool } from '../tool.js';
import { parseAndValidateSchedulesFilterString } from './schedulesFilterUtils.js';

const paramsSchema = {
  filter: z.string().optional(),
  pageSize: z.number().gt(0).optional(),
  limit: z.number().gt(0).optional(),
};

/**
 * Tool that lists schedules on the current Tableau site.
 *
 * Design notes:
 * - Uses the site-scoped `/sites/{site-id}/schedules` endpoint, which is
 *   supported on both Tableau Cloud and Tableau Server. The Server-only
 *   server-scoped `/schedules` variant is intentionally not exposed.
 * - Schedules have no natural project/tag/workbook/datasource dimension, so
 *   the BoundedContext allowlists do not apply and no `constrain*` pass is run.
 * - Filter field support varies between Cloud and Server; we accept the
 *   Server-documented superset and let the Tableau backend decide what to
 *   honor. See {@link parseAndValidateSchedulesFilterString}.
 */
export const getListSchedulesTool = (server: Server): Tool<typeof paramsSchema> => {
  const listSchedulesTool = new Tool({
    server,
    name: 'list-schedules',
    description: `
  Retrieves a list of schedules on a Tableau site including their metadata such as name, frequency, state, execution order, and type (Extract, Subscription, or Flow). Supports optional filtering via field:operator:value expressions (e.g., type:eq:Extract) for precise and flexible schedule discovery. Use this tool when a user requests to list, search, or filter Tableau schedules on a site.

  Supported on both Tableau Cloud and Tableau Server, using the site-scoped schedules endpoint.

  **Supported Filter Fields and Operators**
  | Field       | Operators            |
  |-------------|----------------------|
  | createdAt   | eq, gt, gte, lt, lte |
  | name        | eq, in               |
  | type        | eq                   |
  | updatedAt   | eq, gt, gte, lt, lte |

  ${genericFilterDescription}

  **Example Usage:**
  - List all schedules on the site
  - List extract-refresh schedules only:
      filter: "type:eq:Extract"
  - List schedules named "Daily 3am":
      filter: "name:eq:Daily 3am"
  - List schedules updated after January 1, 2024:
      filter: "updatedAt:gt:2024-01-01T00:00:00Z"`,
    paramsSchema,
    annotations: {
      title: 'List Schedules',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async ({ filter, pageSize, limit }, extra): Promise<CallToolResult> => {
      const configWithOverrides = await extra.getConfigWithOverrides();
      const validatedFilter = filter ? parseAndValidateSchedulesFilterString(filter) : undefined;

      return await listSchedulesTool.logAndExecute({
        extra,
        args: {},
        callback: async () => {
          return new Ok(
            await useRestApi({
              ...extra,
              jwtScopes: listSchedulesTool.requiredApiScopes,
              callback: async (restApi) => {
                const maxResultLimit = configWithOverrides.getMaxResultLimit(
                  listSchedulesTool.name,
                );

                const schedules = await paginate({
                  pageConfig: {
                    pageSize,
                    limit: maxResultLimit
                      ? Math.min(maxResultLimit, limit ?? Number.MAX_SAFE_INTEGER)
                      : limit,
                  },
                  getDataFn: async (pageConfig) => {
                    const { pagination, schedules: data } =
                      await restApi.schedulesMethods.listSchedules({
                        siteId: restApi.siteId,
                        filter: validatedFilter ?? '',
                        pageSize: pageConfig.pageSize,
                        pageNumber: pageConfig.pageNumber,
                      });

                    return { pagination, data };
                  },
                });

                return schedules;
              },
            }),
          );
        },
        constrainSuccessResult: (schedules) => constrainSchedules({ schedules }),
      });
    },
  });

  return listSchedulesTool;
};

/**
 * Empty-result normalization for schedules.
 *
 * Schedules don't participate in the site-level BoundedContext (no project/tag
 * dimension), so this helper only standardizes the empty-list response.
 */
export function constrainSchedules({
  schedules,
}: {
  schedules: Array<Schedule>;
}): ConstrainedResult<Array<Schedule>> {
  if (schedules.length === 0) {
    return {
      type: 'empty',
      message:
        'No schedules were found. Either none exist or you do not have permission to view them.',
    };
  }

  return {
    type: 'success',
    result: schedules,
  };
}
