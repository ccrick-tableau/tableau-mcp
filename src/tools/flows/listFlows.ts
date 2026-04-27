import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { BoundedContext } from '../../overridableConfig.js';
import { useRestApi } from '../../restApiInstance.js';
import { Flow } from '../../sdks/tableau/types/flow.js';
import { Server } from '../../server.js';
import { paginate } from '../../utils/paginate.js';
import { genericFilterDescription } from '../genericFilterDescription.js';
import { ConstrainedResult, Tool } from '../tool.js';
import { parseAndValidateFlowsFilterString } from './flowsFilterUtils.js';

const paramsSchema = {
  filter: z.string().optional(),
  pageSize: z.number().gt(0).optional(),
  limit: z.number().gt(0).optional(),
};

export const getListFlowsTool = (server: Server): Tool<typeof paramsSchema> => {
  const listFlowsTool = new Tool({
    server,
    name: 'list-flows',
    description: `
  Retrieves a list of flows on a Tableau site including their metadata such as name, description, project, owner, and tags. Supports optional filtering via field:operator:value expressions (e.g., name:eq:Superstore Flow) for precise and flexible flow discovery. Use this tool when a user requests to list, search, or filter Tableau Prep flows on a site.

  **Supported Filter Fields and Operators**
  | Field        | Operators            |
  |--------------|----------------------|
  | createdAt    | eq, gt, gte, lt, lte |
  | name         | eq, in               |
  | ownerDomain  | eq, in               |
  | ownerEmail   | eq, in               |
  | ownerName    | eq, in               |
  | projectName  | eq, in               |
  | tags         | eq, in               |
  | updatedAt    | eq, gt, gte, lt, lte |

  ${genericFilterDescription}

  **Example Usage:**
  - List all flows on a site
  - List flows with the name "Superstore Flow":
      filter: "name:eq:Superstore Flow"
  - List flows in the "Finance" project:
      filter: "projectName:eq:Finance"
  - List flows created after January 1, 2023:
      filter: "createdAt:gt:2023-01-01T00:00:00Z"
  - List flows with the name "Superstore Flow" in the "Samples" project and created after January 1, 2023:
      filter: "name:eq:Superstore Flow,projectName:eq:Samples,createdAt:gt:2023-01-01T00:00:00Z"`,
    paramsSchema,
    annotations: {
      title: 'List Flows',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async ({ filter, pageSize, limit }, extra): Promise<CallToolResult> => {
      const configWithOverrides = await extra.getConfigWithOverrides();
      const validatedFilter = filter ? parseAndValidateFlowsFilterString(filter) : undefined;

      return await listFlowsTool.logAndExecute({
        extra,
        args: {},
        callback: async () => {
          return new Ok(
            await useRestApi({
              ...extra,
              jwtScopes: listFlowsTool.requiredApiScopes,
              callback: async (restApi) => {
                const maxResultLimit = configWithOverrides.getMaxResultLimit(listFlowsTool.name);

                const flows = await paginate({
                  pageConfig: {
                    pageSize,
                    limit: maxResultLimit
                      ? Math.min(maxResultLimit, limit ?? Number.MAX_SAFE_INTEGER)
                      : limit,
                  },
                  getDataFn: async (pageConfig) => {
                    const { pagination, flows: data } =
                      await restApi.flowsMethods.queryFlowsForSite({
                        siteId: restApi.siteId,
                        filter: validatedFilter ?? '',
                        pageSize: pageConfig.pageSize,
                        pageNumber: pageConfig.pageNumber,
                      });

                    return { pagination, data };
                  },
                });

                return flows;
              },
            }),
          );
        },
        constrainSuccessResult: (flows) =>
          constrainFlows({ flows, boundedContext: configWithOverrides.boundedContext }),
      });
    },
  });

  return listFlowsTool;
};

/**
 * Applies the site-level {@link BoundedContext} to a list of flows.
 *
 * Notes on parity with the workbook/datasource equivalents:
 * - There is no `flowIds` set in `BoundedContext` today, so flows are not filtered by
 *   an explicit flow-id allowlist. A future PR that adds mutation tools (run-flow,
 *   create-schedule, etc.) may introduce `INCLUDE_FLOW_IDS` alongside those features.
 * - `datasourceIds` does not apply to flows at the listing level.
 * - `projectIds` and `tags` are honored identically to workbooks.
 */
export function constrainFlows({
  flows,
  boundedContext,
}: {
  flows: Array<Flow>;
  boundedContext: BoundedContext;
}): ConstrainedResult<Array<Flow>> {
  if (flows.length === 0) {
    return {
      type: 'empty',
      message: 'No flows were found. Either none exist or you do not have permission to view them.',
    };
  }

  const { projectIds, tags } = boundedContext;
  if (projectIds) {
    flows = flows.filter((flow) => (flow.project?.id ? projectIds.has(flow.project.id) : false));
  }

  if (tags) {
    flows = flows.filter((flow) => flow.tags?.tag?.some((tag) => tags.has(tag.label)));
  }

  if (flows.length === 0) {
    return {
      type: 'empty',
      message: [
        'The set of allowed flows that can be queried is limited by the server configuration.',
        'While flows were found, they were all filtered out by the server configuration.',
      ].join(' '),
    };
  }

  return {
    type: 'success',
    result: flows,
  };
}
