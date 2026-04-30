import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';

import { BoundedContext } from '../../overridableConfig.js';
import { useRestApi } from '../../restApiInstance.js';
import { ExtractRefreshTask } from '../../sdks/tableau/types/extractRefreshTask.js';
import { Server } from '../../server.js';
import { ConstrainedResult, Tool } from '../tool.js';

const paramsSchema = {};

/**
 * Tool that lists all extract refresh tasks on the current Tableau site.
 *
 * Design notes:
 * - The Tableau REST endpoint for extract refresh tasks does not support
 *   pagination or filtering; the server always returns all tasks in a single
 *   response. We therefore expose no params.
 * - A task targets either a workbook or a datasource. If the site-level
 *   BoundedContext restricts workbookIds / datasourceIds / projectIds, we do a
 *   best-effort filter by the task's stated workbook/datasource id. We do NOT
 *   follow-through to project membership for each task here to avoid a fan-out
 *   of REST calls; project-level gating is deferred to `run-extract-refresh`.
 */
export const getListExtractRefreshTasksTool = (server: Server): Tool<typeof paramsSchema> => {
  const listExtractRefreshTasksTool = new Tool({
    server,
    name: 'list-extract-refresh-tasks',
    description: `
  Retrieves the list of all extract refresh tasks configured on the Tableau site, including their target (workbook or datasource), schedule, type (FullRefresh or IncrementalRefresh), and health counters.

  The underlying Tableau REST endpoint does not support pagination or filtering, so this tool takes no arguments and returns every task the caller has permission to see.

  **When to use**
  - Discovering which extract refresh tasks exist on the site.
  - Finding the task id needed by \`run-extract-refresh\`.
  - Auditing task configuration (e.g., which datasources have refreshes, how many are failing).`,
    paramsSchema,
    annotations: {
      title: 'List Extract Refresh Tasks',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async (_args, extra): Promise<CallToolResult> => {
      const configWithOverrides = await extra.getConfigWithOverrides();

      return await listExtractRefreshTasksTool.logAndExecute({
        extra,
        args: {},
        callback: async () => {
          return new Ok(
            await useRestApi({
              ...extra,
              jwtScopes: listExtractRefreshTasksTool.requiredApiScopes,
              callback: async (restApi) => {
                return await restApi.tasksMethods.listExtractRefreshTasks({
                  siteId: restApi.siteId,
                });
              },
            }),
          );
        },
        constrainSuccessResult: (tasks) =>
          constrainExtractRefreshTasks({
            tasks,
            boundedContext: configWithOverrides.boundedContext,
          }),
      });
    },
  });

  return listExtractRefreshTasksTool;
};

/**
 * Applies the site-level {@link BoundedContext} to a list of extract refresh tasks.
 *
 * A task targets either a workbook or a datasource; we filter using whichever
 * of the two target ids is present. Tasks targeting a resource that is
 * explicitly disallowed by `workbookIds` / `datasourceIds` are removed.
 *
 * We intentionally do not consult `projectIds` or `tags` here: doing so would
 * require fetching each referenced resource, which is expensive for a list
 * endpoint. Project/tag gating is enforced when the caller tries to
 * actually run one of the tasks via `run-extract-refresh`.
 */
export function constrainExtractRefreshTasks({
  tasks,
  boundedContext,
}: {
  tasks: Array<ExtractRefreshTask>;
  boundedContext: BoundedContext;
}): ConstrainedResult<Array<ExtractRefreshTask>> {
  if (tasks.length === 0) {
    return {
      type: 'empty',
      message:
        'No extract refresh tasks were found. Either none exist or you do not have permission to view them.',
    };
  }

  const { workbookIds, datasourceIds } = boundedContext;

  if (workbookIds || datasourceIds) {
    tasks = tasks.filter((task) => {
      if (task.workbook?.id) {
        return workbookIds ? workbookIds.has(task.workbook.id) : true;
      }
      if (task.datasource?.id) {
        return datasourceIds ? datasourceIds.has(task.datasource.id) : true;
      }
      // Tasks with neither target id are extremely unusual; keep them.
      return true;
    });
  }

  if (tasks.length === 0) {
    return {
      type: 'empty',
      message: [
        'The set of allowed resources is limited by the server configuration.',
        'While extract refresh tasks were found, they were all filtered out by the server configuration.',
      ].join(' '),
    };
  }

  return {
    type: 'success',
    result: tasks,
  };
}
