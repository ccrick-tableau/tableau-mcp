import { makeApi, makeEndpoint, ZodiosEndpointDefinitions } from '@zodios/core';
import { z } from 'zod';

import { paginationSchema } from '../types/pagination.js';
import { createScheduleRequestBodySchema, scheduleSchema } from '../types/schedule.js';
import { paginationParameters } from './paginationParameters.js';

const listSchedulesEndpoint = makeEndpoint({
  method: 'get',
  path: '/sites/:siteId/schedules',
  alias: 'listSchedules',
  description:
    'Returns a list of schedules on the specified site. Supported on both Tableau Cloud and Tableau Server.',
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
        'An expression that lets you specify a subset of schedules to return. You can filter on predefined fields such as name, type, and createdAt. You can include multiple filter expressions.',
    },
  ],
  response: z.object({
    pagination: paginationSchema,
    schedules: z.object({
      schedule: z.optional(z.array(scheduleSchema)),
    }),
  }),
});

const createScheduleEndpoint = makeEndpoint({
  method: 'post',
  path: '/sites/:siteId/schedules',
  alias: 'createSchedule',
  description:
    'Creates a new schedule on the specified site. Returns the created schedule resource. Requires site-admin (Cloud) or server-admin (Server) privileges.',
  parameters: [
    {
      name: 'body',
      type: 'Body',
      schema: createScheduleRequestBodySchema,
    },
    {
      name: 'siteId',
      type: 'Path',
      schema: z.string(),
    },
  ],
  response: z.object({ schedule: scheduleSchema }),
});

const schedulesApi = makeApi([listSchedulesEndpoint, createScheduleEndpoint]);

export const schedulesApis = [...schedulesApi] as const satisfies ZodiosEndpointDefinitions;
