import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Ok } from 'ts-results-es';
import { z } from 'zod';

import { FlowNotAllowedError } from '../../errors/mcpToolError.js';
import { BoundedContext } from '../../overridableConfig.js';
import { useRestApi } from '../../restApiInstance.js';
import { Flow } from '../../sdks/tableau/types/flow.js';
import { Server } from '../../server.js';
import { ConstrainedResult, Tool } from '../tool.js';

const paramsSchema = {
  flowId: z.string(),
};

export const getGetFlowTool = (server: Server): Tool<typeof paramsSchema> => {
  const getFlowTool = new Tool({
    server,
    name: 'get-flow',
    description:
      'Retrieves information about the specified Tableau Prep flow, including its project, owner, and tags.',
    paramsSchema,
    annotations: {
      title: 'Get Flow',
      readOnlyHint: true,
      openWorldHint: false,
    },
    callback: async ({ flowId }, extra): Promise<CallToolResult> => {
      const configWithOverrides = await extra.getConfigWithOverrides();

      return await getFlowTool.logAndExecute<Flow>({
        extra,
        args: { flowId },
        callback: async () => {
          return new Ok(
            await useRestApi({
              ...extra,
              jwtScopes: getFlowTool.requiredApiScopes,
              callback: async (restApi) => {
                return await restApi.flowsMethods.getFlow({
                  flowId,
                  siteId: restApi.siteId,
                });
              },
            }),
          );
        },
        constrainSuccessResult: (flow) =>
          applyBoundedContextToFlow({
            flow,
            boundedContext: configWithOverrides.boundedContext,
          }),
      });
    },
  });

  return getFlowTool;
};

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
