import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { extractRefreshTaskSchema } from '../types/extractRefreshTask.js';
import { jobSchema } from '../types/job.js';

const listExtractRefreshTasksEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/tasks/extractRefreshes',
  alias: 'listExtractRefreshTasks',
  description:
    'Returns a list of all extract refresh tasks on the specified site. This endpoint does not support pagination.',
  response: z.object({
    tasks: z.object({
      task: z
        .array(
          z.object({
            extractRefresh: extractRefreshTaskSchema,
          }),
        )
        .optional(),
    }),
  }),
});

const runExtractRefreshTaskEndpoint = makeEndpoint({
  method: 'post',
  path: '/sites/:siteId/tasks/extractRefreshes/:taskId/runNow',
  alias: 'runExtractRefreshTask',
  description:
    'Runs the specified extract refresh task. Returns the job created to perform the refresh.',
  parameters: [
    {
      name: 'body',
      type: 'Body',
      schema: z.object({}).optional(),
      description:
        'An empty request body. Tableau accepts an empty tsRequest envelope for run-now operations.',
    },
  ],
  response: z.object({ job: jobSchema }),
});

const tasksApi = makeApi([listExtractRefreshTasksEndpoint, runExtractRefreshTaskEndpoint]);

export const tasksApis = [...tasksApi] as const satisfies ZodiosEndpointDefinitions;
