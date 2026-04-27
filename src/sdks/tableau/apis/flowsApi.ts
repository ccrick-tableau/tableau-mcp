import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { flowSchema } from '../types/flow.js';
import { paginationSchema } from '../types/pagination.js';
import { paginationParameters } from './paginationParameters.js';

const getFlowEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/flows/:flowId',
  alias: 'getFlow',
  description:
    'Returns information about the specified flow, including information about the project and owner.',
  response: z.object({ flow: flowSchema }),
});

const queryFlowsForSiteEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/flows',
  alias: 'queryFlowsForSite',
  description: 'Returns the flows on a site.',
  parameters: [
    ...paginationParameters,
    {
      name: 'siteId',
      type: 'Path',
      schema: z.string(),
    },
    {
      name: 'filter',
      type: 'Query',
      schema: z.string().optional(),
      description:
        'An expression that lets you specify a subset of flows to return. You can filter on predefined fields such as name, tags, and createdAt. You can include multiple filter expressions.',
    },
  ],
  response: z.object({
    pagination: paginationSchema,
    flows: z.object({
      flow: z.optional(z.array(flowSchema)),
    }),
  }),
});

const flowsApi = makeApi([queryFlowsForSiteEndpoint, getFlowEndpoint]);

export const flowsApis = [...flowsApi] as const satisfies ZodiosEndpointDefinitions;
