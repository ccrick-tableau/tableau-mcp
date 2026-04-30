import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { FlowNotAllowedError } from '../../errors/mcpToolError.js';
import { useRestApi } from '../../restApiInstance.js';
import { Job } from '../../sdks/tableau/types/job.js';
import { Server } from '../../server.js';
import { getExceptionMessage } from '../../utils/getExceptionMessage.js';
import { Tool } from '../tool.js';
import { applyBoundedContextToFlow } from './getFlow.js';

const paramsSchema = {
  flowId: z.string().min(1),
};

/**
 * Tool that triggers an asynchronous run of a Tableau Prep flow.
 *
 * Design notes:
 * - Returns the {@link Job} immediately rather than polling to completion. A flow
 *   run can take minutes to hours; tying up the MCP tool call for that duration
 *   is a poor fit for agent workflows. The returned job id can be passed to
 *   `get-job` to observe completion.
 * - Annotations reflect that this tool performs a server-side mutation (the
 *   flow produces output artifacts and records run history), but the mutation
 *   is not destructive in the MCP sense and is not idempotent (two runs are
 *   not equivalent to one).
 * - Before invoking the REST API we fetch the flow and apply the site-level
 *   BoundedContext (projectIds / tags) so a flow we would not be allowed to
 *   read cannot be triggered.
 */
export const getRunFlowTool = (server: Server): Tool<typeof paramsSchema> => {
  const runFlowTool = new Tool({
    server,
    name: 'run-flow',
    description: `
  Runs the specified Tableau Prep flow and returns the job created to perform the run.

  The flow run is executed asynchronously on the Tableau site. This tool returns the job immediately without waiting for completion. Use the \`get-job\` tool with the returned \`id\` to observe progress and final status.

  **Required argument**
  - \`flowId\`: The LUID of the flow to run, typically obtained from \`list-flows\` or \`get-flow\`.

  **When to use**
  - Manually trigger a prep flow on demand (e.g., refresh output datasources after upstream data changes).
  - Kick off a flow whose normal schedule has not yet fired but whose output is needed now.

  **Side effects**
  - Running a flow overwrites its output datasources and writes a new entry to the flow's run history.
  - Re-running a flow is not equivalent to running it once: each invocation produces new output artifacts and consumes Tableau job slots.`,
    paramsSchema,
    annotations: {
      title: 'Run Flow',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    callback: async ({ flowId }, extra): Promise<CallToolResult> => {
      const configWithOverrides = await extra.getConfigWithOverrides();

      return await runFlowTool.logAndExecute<Job>({
        extra,
        args: { flowId },
        callback: async () => {
          return await useRestApi({
            ...extra,
            jwtScopes: runFlowTool.requiredApiScopes,
            callback: async (restApi) => {
              // Gate the run behind the same bounded-context check used by get-flow.
              // A flow the caller cannot read must not be runnable.
              try {
                const flow = await restApi.flowsMethods.getFlow({
                  flowId,
                  siteId: restApi.siteId,
                });

                const boundedCheck = applyBoundedContextToFlow({
                  flow,
                  boundedContext: configWithOverrides.boundedContext,
                });
                if (boundedCheck.type === 'error') {
                  return new FlowNotAllowedError(
                    [
                      `The flow with LUID ${flowId} is not allowed to be run.`,
                      boundedCheck.message,
                    ].join(' '),
                  ).toErr();
                }
              } catch (error) {
                return new FlowNotAllowedError(
                  [
                    `Unable to verify permissions for the flow with LUID ${flowId} before running it.`,
                    getExceptionMessage(error),
                  ].join(' '),
                ).toErr();
              }

              const job = await restApi.flowsMethods.runFlowNow({
                flowId,
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

  return runFlowTool;
};
