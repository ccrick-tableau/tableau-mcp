import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { flowSchema } from '../types/flow.js';
import { flowConnectionSchema } from '../types/flowConnection.js';
import { flowRunSchema } from '../types/flowRun.js';
import { jobSchema } from '../types/job.js';
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

const runFlowNowEndpoint = makeEndpoint({
  method: 'post',
  path: '/sites/:siteId/flows/:flowId/run',
  alias: 'runFlowNow',
  description:
    'Runs the specified flow and returns the job created to perform the run. This is an asynchronous operation; the returned job can be polled via the Query Job endpoint.',
  parameters: [
    {
      name: 'body',
      type: 'Body',
      schema: z.object({}).optional(),
      description:
        'An empty request body. Flow parameter overrides are not currently exposed through this tool.',
    },
  ],
  response: z.object({ job: jobSchema }),
});

const getFlowRunsEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/flows/:flowId/runs',
  alias: 'getFlowRuns',
  description:
    'Returns historical flow runs for the specified flow. Tableau returns runs in reverse-chronological order.',
  response: z.object({
    flowRuns: z.object({
      flowRun: z.optional(z.array(flowRunSchema)),
    }),
  }),
});

const getFlowConnectionsEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/flows/:flowId/connections',
  alias: 'getFlowConnections',
  description:
    'Returns the input connections (databases, files, published data sources) that the specified flow reads from.',
  response: z.object({
    connections: z.object({
      connection: z.optional(z.array(flowConnectionSchema)),
    }),
  }),
});

const flowsApi = makeApi([
  queryFlowsForSiteEndpoint,
  getFlowEndpoint,
  runFlowNowEndpoint,
  getFlowRunsEndpoint,
  getFlowConnectionsEndpoint,
]);

export const flowsApis = [...flowsApi] as const satisfies ZodiosEndpointDefinitions;
