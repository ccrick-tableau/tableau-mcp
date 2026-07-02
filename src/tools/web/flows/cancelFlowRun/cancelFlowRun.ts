import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { getConfig } from '../../../../config.js';
import { McpToolError } from '../../../../errors/mcpToolError.js';
import { useRestApi } from '../../../../restApiInstance.js';
import { WebMcpServer } from '../../../../server.web.js';
import { WebTool } from '../../tool.js';
import { mapCancelFlowRunError } from '../flowWriteErrors.js';

const paramsSchema = {
  flowRunId: z.string().nonempty(),
};

/**
 * Wrapped result: an `mcp.cancelStatus` note so the model reports the cancel as
 * *requested* (best-effort, asynchronous) rather than as an instant, guaranteed
 * stop.
 */
export type CancelFlowRunResult = {
  mcp: {
    cancelStatus: string;
  };
};

export const getCancelFlowRunTool = (server: WebMcpServer): WebTool<typeof paramsSchema> => {
  const config = getConfig();
  const cancelFlowRunTool = new WebTool({
    server,
    name: 'cancel-flow-run',
    // First-class content mutation: opt-in via FLOW_WRITE_TOOLS_ENABLED.
    disabled: !config.flowWriteToolsEnabled,
    description: `
  Cancels an **in-progress Tableau Prep flow run**, by flow *run* id (not flow id). This is the counterpart to \`run-flow\` / \`run-flow-task\`: use it to stop a run you started that is still queued or executing.

  Get the \`flowRunId\` from \`run-flow\` / \`run-flow-task\` (\`job.runFlowJobType.flowRunId\`) or from \`list-flow-runs\`. To only inspect runs, use \`list-flow-runs\` / \`get-flow\` (read-only).

  **This tool changes server state.** Cancellation is **best-effort and asynchronous**, not an instant kill:
  - The run may take several seconds to actually stop (the backend polls for cancellation periodically).
  - If the run is already **writing to an output database**, that write may finish even after the run shows Cancelled, which can leave the target in a partially-updated state. Cancelling does not roll back writes.
  - It does **not** alter the flow definition or its schedule — it stops one run.

  **Parameters:**
  - \`flowRunId\` (required) – The id of the flow run to cancel.

  **Response:** \`{ mcp: { cancelStatus } }\`. Report the cancel as *requested*, then confirm the final state with \`list-flow-runs\` (filter \`flowId:eq:<id>\`) or \`get-flow\`.

  **Requirements & limits:**
  - **Caller-role:** in addition to site/server administrators, you can cancel a flow run only if you **initiated the run** (or created its scheduled task) **and** have Run Flow permission on the flow. Non-permitted callers get a clear permission error.
  - Fails if the run has **already completed** (nothing to cancel), or if a site administrator has **disabled flow-run cancellation** for the site.
  - **Bounded-context note:** when this MCP server is restricted to specific projects/tags, this tool cannot verify that the flow run's flow is in the allowed set (a run is addressed only by run id), so it refuses \u2014 mirroring \`run-flow-task\`.
  - Requires Tableau REST API access scope \`tableau:flow_runs:update\`.`,
    paramsSchema,
    annotations: {
      title: 'Cancel Flow Run',
      readOnlyHint: false,
      // Cancelling does not delete the flow, its schedule, or its definition,
      // but interrupting a run mid-write can leave an output database in a
      // partially-updated state (cancellation does not roll back writes), so we
      // flag it as destructive to be honest with clients.
      destructiveHint: true,
      // Not idempotent: cancelling an already-finished run returns a distinct
      // "already complete" error rather than silently succeeding.
      idempotentHint: false,
      openWorldHint: false,
    },
    callback: async ({ flowRunId }, extra): Promise<CallToolResult> => {
      return await cancelFlowRunTool.logAndExecute<CancelFlowRunResult>({
        extra,
        args: { flowRunId },
        callback: async () => {
          // Fail closed under a bounded context. A flow run is addressed only by
          // run id and carries no project or tag, so (exactly like
          // run-flow-task) we cannot prove the underlying flow belongs to the
          // allowed set. Refuse rather than risk cancelling a run outside scope.
          const { boundedContext } = await extra.getConfigWithOverrides();
          if (boundedContext.projectIds || boundedContext.tags) {
            return new McpToolError({
              type: 'flow-run-not-allowed',
              statusCode: 403,
              message: [
                'This MCP server is restricted to an allowed set of projects or tags.',
                'A flow run is not associated with a project or tag, so this tool cannot verify that the run belongs to the allowed set and will not cancel a run under this configuration.',
                'There is no flow-id-addressed alternative for cancellation, so do not retry — flow-run cancellation is unavailable while this server is bounded to specific projects or tags.',
              ].join(' '),
            }).toErr();
          }

          try {
            await useRestApi({
              ...extra,
              jwtScopes: cancelFlowRunTool.requiredApiScopes,
              callback: async (restApi) =>
                restApi.flowsMethods.cancelFlowRun({
                  siteId: restApi.siteId,
                  flowRunId,
                }),
            });

            return new Ok({
              mcp: {
                cancelStatus:
                  'Cancellation has been requested. Cancellation is best-effort and may take a few seconds; if the run was writing to an output database that write may still complete. Use list-flow-runs or get-flow to confirm the final status.',
              },
            } satisfies CancelFlowRunResult);
          } catch (error) {
            return mapCancelFlowRunError(error).toErr();
          }
        },
        constrainSuccessResult: (result) => ({ type: 'success', result }),
      });
    },
  });

  return cancelFlowRunTool;
};

export const exportedForTesting = {
  cancelFlowRunParamsSchema: paramsSchema,
};
