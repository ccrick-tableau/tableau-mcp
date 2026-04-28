import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { jobSchema } from '../types/job.js';

const queryJobEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/jobs/:jobId',
  alias: 'queryJob',
  description:
    'Returns the status of an asynchronous process (job) that was started by a prior operation such as running a flow or extract refresh task.',
  response: z.object({ job: jobSchema }),
});

const jobsApi = makeApi([queryJobEndpoint]);

export const jobsApis = [...jobsApi] as const satisfies ZodiosEndpointDefinitions;
