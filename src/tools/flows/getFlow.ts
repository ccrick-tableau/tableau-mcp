import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { FlowNotAllowedError } from '../../errors/mcpToolError.js';
import { log } from '../../logging/logger.js';
import { BoundedContext } from '../../overridableConfig.js';
import { useRestApi } from '../../restApiInstance.js';
import { Flow } from '../../sdks/tableau/types/flow.js';
import { FlowConnection } from '../../sdks/tableau/types/flowConnection.js';
import { FlowRun } from '../../sdks/tableau/types/flowRun.js';
import { Server } from '../../server.js';
import { getExceptionMessage } from '../../utils/getExceptionMessage.js';
import { ConstrainedResult, Tool } from '../tool.js';

const DEFAULT_FLOW_RUN_LIMIT = 10;
const MAX_FLOW_RUN_LIMIT = 50;

const paramsSchema = {
  flowId: z.string(),
  includeFlowRuns: z
    .boolean()
    .optional()
    .describe(
      'When true (default), the result includes up to `flowRunLimit` most-recent flow runs in `flowRuns`.',
    ),
  includeConnections: z
    .boolean()
    .optional()
    .describe(
      'When true (default), the result includes the input connections the flow reads from in `connections`.',
    ),
  flowRunLimit: z
    .number()
    .int()
    .min(1)
    .max(MAX_FLOW_RUN_LIMIT)
    .optional()
    .describe(
      `Maximum number of recent flow runs to include (1-${MAX_FLOW_RUN_LIMIT}). Defaults to ${DEFAULT_FLOW_RUN_LIMIT}. Only applies when includeFlowRuns is true.`,
    ),
};

/**
 * Tool that returns a Tableau Prep flow with optional operational enrichment.
 *
 * Beyond the base flow resource, the tool can attach:
 *   - `flowRuns`: the most recent run history (success/failure/duration),
 *     obtained from `GET /sites/{id}/flows/{id}/runs`.
 *   - `connections`: the input data connections the flow reads from,
 *     obtained from `GET /sites/{id}/flows/{id}/connections`.
 *
 * Both enrichments default to on. Each is fetched via its own REST call in
 * parallel with the flow lookup. Individual enrichment failures are recorded
 * on the returned flow as an empty array plus a log line, rather than failing
 * the whole tool call \u2014 a flow whose base data is readable should not be
 * rendered unqueryable by a transient runs/connections error.
 *
 * Bounded-context gating (project/tags) is applied after the base flow fetch
 * and before enrichment, so enrichment does not run for flows the caller is
 * not permitted to see.\n */
export const getGetFlowTool = (server: Server): Tool<typeof paramsSchema> => {
  const getFlowTool = new Tool({
    server,
    name: 'get-flow',
    description: `Retrieves information about the specified Tableau Prep flow, including its project, owner, and tags.

  By default the result is enriched with:
  - \`flowRuns\`: up to the 10 most-recent runs (configurable via \`flowRunLimit\`, max ${MAX_FLOW_RUN_LIMIT}).
  - \`connections\`: the flow's input data connections.

  Disable either enrichment with \`includeFlowRuns: false\` or \`includeConnections: false\` if you only need the base flow metadata. Enrichment data is absent from \`list-flows\`; use this tool when you need operational context.`,
    paramsSchema,
    annotations: {
      title: 'Get Flow',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async (
      { flowId, includeFlowRuns, includeConnections, flowRunLimit },
      extra,
    ): Promise<CallToolResult> => {
      const configWithOverrides = await extra.getConfigWithOverrides();
      const wantRuns = includeFlowRuns !== false;
      const wantConnections = includeConnections !== false;
      const runLimit = flowRunLimit ?? DEFAULT_FLOW_RUN_LIMIT;

      return await getFlowTool.logAndExecute<Flow>({
        extra,
        args: { flowId },
        callback: async () => {
          return await useRestApi({
            ...extra,
            jwtScopes: getFlowTool.requiredApiScopes,
            callback: async (restApi) => {
              const rawFlow = await restApi.flowsMethods.getFlow({
                flowId,
                siteId: restApi.siteId,
              });
              // Shallow-clone so we can safely attach enrichment fields
              // without mutating the object returned by the SDK.
              const flow: Flow = { ...rawFlow };

              // Enforce bounded context before doing any enrichment work.
              const boundedCheck = applyBoundedContextToFlow({
                flow,
                boundedContext: configWithOverrides.boundedContext,
              });
              if (boundedCheck.type === 'error') {
                return new FlowNotAllowedError(boundedCheck.message).toErr();
              }

              // Enrich. Each enrichment is best-effort: a failure records an
              // empty array and a log line rather than erroring the whole call.
              const [flowRuns, connections] = await Promise.all([
                wantRuns
                  ? fetchFlowRuns({
                      getRuns: () =>
                        restApi.flowsMethods.getFlowRuns({ flowId, siteId: restApi.siteId }),
                      flowId,
                    })
                  : Promise.resolve(undefined),
                wantConnections
                  ? fetchFlowConnections({
                      getConnections: () =>
                        restApi.flowsMethods.getFlowConnections({
                          flowId,
                          siteId: restApi.siteId,
                        }),
                      flowId,
                    })
                  : Promise.resolve(undefined),
              ]);

              if (flowRuns !== undefined) {
                // Tableau returns runs in reverse-chronological order; slice
                // to the requested limit defensively.
                flow.flowRuns = flowRuns.slice(0, runLimit);
              }
              if (connections !== undefined) {
                flow.connections = connections;
              }

              return new Ok(flow);
            },
          });
        },
        // Bounded-context enforcement has already happened inside the callback.
        // Keep the shape consistent with the rest of the codebase by
        // returning the enriched flow as-is.
        constrainSuccessResult: (flow) => ({ type: 'success', result: flow }),
      });
    },
  });

  return getFlowTool;
};

async function fetchFlowRuns({
  getRuns,
  flowId,
}: {
  getRuns: () => Promise<FlowRun[]>;
  flowId: string;
}): Promise<FlowRun[]> {
  try {
    return await getRuns();
  } catch (error) {
    log({
      message: `get-flow: failed to fetch flowRuns for flow ${flowId}: ${getExceptionMessage(error)}`,
      level: 'warning',
      logger: 'tool',
    });
    return [];
  }
}

async function fetchFlowConnections({
  getConnections,
  flowId,
}: {
  getConnections: () => Promise<FlowConnection[]>;
  flowId: string;
}): Promise<FlowConnection[]> {
  try {
    return await getConnections();
  } catch (error) {
    log({
      message: `get-flow: failed to fetch connections for flow ${flowId}: ${getExceptionMessage(error)}`,
      level: 'warning',
      logger: 'tool',
    });
    return [];
  }
}

/**
 * Applies the site-level {@link BoundedContext} to a single flow.
 *
 * Mirrors the {@link constrainFlows} behavior used by list-flows: honors `projectIds`
 * and `tags` allowlists. If the flow does not match, a {@link FlowNotAllowedError} is
 * returned so the caller gets a clear 403-style message rather than an empty result.
 */
export function applyBoundedContextToFlow({
  flow,
  boundedContext,
}: {
  flow: Flow;
  boundedContext: BoundedContext;
}): ConstrainedResult<Flow> {
  const { projectIds, tags } = boundedContext;

  if (projectIds && !(flow.project?.id && projectIds.has(flow.project.id))) {
    return {
      type: 'error',
      message: [
        'The set of allowed flows that can be queried is limited by the server configuration.',
        `The flow with LUID ${flow.id} cannot be queried because it does not belong to an allowed project.`,
      ].join(' '),
      error: new FlowNotAllowedError(
        `The flow with LUID ${flow.id} does not belong to an allowed project.`,
      ),
    };
  }

  if (tags && !flow.tags?.tag?.some((tag) => tags.has(tag.label))) {
    return {
      type: 'error',
      message: [
        'The set of allowed flows that can be queried is limited by the server configuration.',
        `The flow with LUID ${flow.id} cannot be queried because it does not have one of the allowed tags.`,
      ].join(' '),
      error: new FlowNotAllowedError(
        `The flow with LUID ${flow.id} does not have one of the allowed tags.`,
      ),
    };
  }

  return {
    type: 'success',
    result: flow,
  };
}
