import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import {
  ExtractRefreshTaskNotAllowedError,
  ExtractRefreshTaskNotFoundError,
} from '../../errors/mcpToolError.js';
import { useRestApi } from '../../restApiInstance.js';
import { ExtractRefreshTask } from '../../sdks/tableau/types/extractRefreshTask.js';
import { Job } from '../../sdks/tableau/types/job.js';
import { Server } from '../../server.js';
import { getExceptionMessage } from '../../utils/getExceptionMessage.js';
import { resourceAccessChecker } from '../resourceAccessChecker.js';
import { Tool } from '../tool.js';

const paramsSchema = {
  taskId: z.string().min(1),
};

/**
 * Tool that triggers an asynchronous run of an existing extract refresh task.
 *
 * Design notes:
 * - Returns the {@link Job} immediately rather than polling. The returned job id
 *   can be passed to `get-job` to observe completion.
 * - An extract refresh task targets either a workbook or a datasource. Before
 *   running the task we resolve its target by listing tasks and finding the
 *   requested one, then delegate to the shared resourceAccessChecker
 *   (workbookIds / datasourceIds / projectIds / tags) for access control.
 *   Callers who do not have permission to see the target via the normal
 *   list/get tools must not be allowed to kick off a refresh against it.
 * - The Tableau REST API does not expose a "get task by id" endpoint for
 *   extract refreshes on all versions; listing is the portable path.
 */
export const getRunExtractRefreshTool = (server: Server): Tool<typeof paramsSchema> => {
  const runExtractRefreshTool = new Tool({
    server,
    name: 'run-extract-refresh',
    description: `
  Runs the specified extract refresh task and returns the job created to perform the refresh.

  The refresh is executed asynchronously on the Tableau site. This tool returns the job immediately without waiting for completion. Use the \`get-job\` tool with the returned \`id\` to observe progress and final status.

  **Required argument**
  - \`taskId\`: The LUID of the extract refresh task to run, typically obtained from \`list-extract-refresh-tasks\`.

  **When to use**
  - Manually refresh an extract on demand (e.g., after an upstream data change) instead of waiting for its scheduled run.
  - Re-run a task that previously failed.

  **Side effects**
  - The target workbook or datasource extract is refreshed, overwriting its current data with the latest query results.
  - Running a refresh is not free: it consumes Tableau backgrounder capacity and counts against site-level refresh quotas.`,
    paramsSchema,
    annotations: {
      title: 'Run Extract Refresh',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    callback: async ({ taskId }, extra): Promise<CallToolResult> => {
      return await runExtractRefreshTool.logAndExecute<Job>({
        extra,
        args: { taskId },
        callback: async () => {
          return await useRestApi({
            ...extra,
            jwtScopes: runExtractRefreshTool.requiredApiScopes,
            callback: async (restApi) => {
              let task: ExtractRefreshTask | undefined;
              try {
                const tasks = await restApi.tasksMethods.listExtractRefreshTasks({
                  siteId: restApi.siteId,
                });
                task = tasks.find((t) => t.id === taskId);
              } catch (error) {
                return new ExtractRefreshTaskNotAllowedError(
                  [
                    `Unable to verify the extract refresh task with LUID ${taskId} before running it.`,
                    getExceptionMessage(error),
                  ].join(' '),
                ).toErr();
              }

              if (!task) {
                return new ExtractRefreshTaskNotFoundError(
                  `The extract refresh task with LUID ${taskId} was not found on this site.`,
                ).toErr();
              }

              // Enforce access control on whatever the task targets.
              if (task.workbook?.id) {
                const allowed = await resourceAccessChecker.isWorkbookAllowed({
                  workbookId: task.workbook.id,
                  extra,
                });
                if (!allowed.allowed) {
                  return new ExtractRefreshTaskNotAllowedError(
                    [
                      `The extract refresh task with LUID ${taskId} cannot be run because its target workbook is not allowed.`,
                      allowed.message,
                    ].join(' '),
                  ).toErr();
                }
              } else if (task.datasource?.id) {
                const allowed = await resourceAccessChecker.isDatasourceAllowed({
                  datasourceLuid: task.datasource.id,
                  extra,
                });
                if (!allowed.allowed) {
                  return new ExtractRefreshTaskNotAllowedError(
                    [
                      `The extract refresh task with LUID ${taskId} cannot be run because its target datasource is not allowed.`,
                      allowed.message,
                    ].join(' '),
                  ).toErr();
                }
              }
              // A task with no target resource id is unusual; fall through and let
              // Tableau's own authorization decide.

              const job = await restApi.tasksMethods.runExtractRefreshTask({
                taskId,
                siteId: restApi.siteId,
              });

              return new Ok(job);
            },
          });
        },
        constrainSuccessResult: (job) => ({ type: 'success', result: job }),
      });
    },
  });

  return runExtractRefreshTool;
};
