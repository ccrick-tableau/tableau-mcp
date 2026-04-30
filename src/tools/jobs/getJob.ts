import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { useRestApi } from '../../restApiInstance.js';
import { Job } from '../../sdks/tableau/types/job.js';
import { Server } from '../../server.js';
import { Tool } from '../tool.js';

const paramsSchema = {
  jobId: z.string().min(1),
};

/**
 * Tool that returns the current status of an asynchronous job.
 *
 * Designed to be paired with `run-flow` and `run-extract-refresh`, which return
 * a job id immediately without waiting for completion.
 *
 * This tool does not perform any polling. Callers that want to wait for a job
 * to finish should invoke `get-job` repeatedly with their own cadence.
 */
export const getGetJobTool = (server: Server): Tool<typeof paramsSchema> => {
  const getJobTool = new Tool({
    server,
    name: 'get-job',
    description: `
  Returns the current status of an asynchronous Tableau job, such as a flow run or an extract refresh triggered by \`run-flow\` or \`run-extract-refresh\`.

  **Required argument**
  - \`jobId\`: The LUID of the job to query, typically obtained from the \`id\` field of a prior \`run-flow\` or \`run-extract-refresh\` result.

  **Interpreting the result**
  - \`progress\`: integer-as-string in [0, 100].
  - \`startedAt\` / \`completedAt\`: populated once the job has started / finished.
  - \`finishCode\` (only meaningful once \`completedAt\` is set):
    - \`"0"\`: success
    - \`"1"\`: failed
    - \`"2"\`: cancelled
  - A job that has no \`completedAt\` is still running or queued.

  **When to use**
  - After calling \`run-flow\` or \`run-extract-refresh\` to observe progress.
  - To inspect the final status (and any failure notes) of a recently triggered job.

  This tool performs a single point-in-time read. It does not poll or wait.`,
    paramsSchema,
    annotations: {
      title: 'Get Job',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async ({ jobId }, extra): Promise<CallToolResult> => {
      return await getJobTool.logAndExecute<Job>({
        extra,
        args: { jobId },
        callback: async () => {
          return new Ok(
            await useRestApi({
              ...extra,
              jwtScopes: getJobTool.requiredApiScopes,
              callback: async (restApi) => {
                return await restApi.jobsMethods.queryJob({
                  jobId,
                  siteId: restApi.siteId,
                });
              },
            }),
          );
        },
        constrainSuccessResult: (job) => ({ type: 'success', result: job }),
      });
    },
  });

  return getJobTool;
};
