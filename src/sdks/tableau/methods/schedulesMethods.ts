import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { schedulesApis } from '../apis/schedulesApi.js';
import { RestApiCredentials } from '../restApi.js';
import { Pagination } from '../types/pagination.js';
import {
  CreateScheduleInput,
  Schedule,
  ScheduleFrequencyDetails,
  weekDayEnum,
} from '../types/schedule.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Schedules methods of the Tableau REST API.
 *
 * @export
 * @class SchedulesMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm
 */
export default class SchedulesMethods extends AuthenticatedMethods<typeof schedulesApis> {
  constructor(baseUrl: string, creds: RestApiCredentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, schedulesApis, { axiosConfig }), creds);
  }

  /**
   * Returns a list of schedules on the specified site.
   *
   * Supported on both Tableau Cloud and Tableau Server. The site-scoped endpoint
   * is used because it is the broadly-compatible option; the Tableau Server-only
   * `/schedules` (server-scoped) endpoint is not exposed through this client.
   *
   * Required scopes: `tableau:content:read`
   *
   * @param siteId The Tableau site ID.
   * @param filter Optional filter expression (e.g. `type:eq:Extract`).
   * @param pageSize Optional page size (min 1, max 1000, default 100).
   * @param pageNumber Optional page number offset (default 1).
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#list_schedules
   */
  listSchedules = async ({
    siteId,
    filter,
    pageSize,
    pageNumber,
  }: {
    siteId: string;
    filter: string;
    pageSize?: number;
    pageNumber?: number;
  }): Promise<{ pagination: Pagination; schedules: Schedule[] }> => {
    const response = await this._apiClient.listSchedules({
      params: { siteId },
      queries: { filter, pageSize, pageNumber },
      ...this.authHeader,
    });
    return {
      pagination: response.pagination,
      schedules: response.schedules.schedule ?? [],
    };
  };

  /**
   * Creates a new schedule on the specified site.
   *
   * Requires site-admin (Tableau Cloud) or server-admin (Tableau Server) privileges.
   * The Tableau backend surfaces permission failures as HTTP 403.
   *
   * Required scopes: `tableau:content:read`
   *
   * @param siteId The Tableau site ID.
   * @param input The schedule specification (validated by createScheduleInputSchema).
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#create_schedule
   */
  createSchedule = async ({
    siteId,
    input,
  }: {
    siteId: string;
    input: CreateScheduleInput;
  }): Promise<Schedule> => {
    const body = buildCreateScheduleRequestBody(input);
    const response = await this._apiClient.createSchedule(body, {
      params: { siteId },
      ...this.authHeader,
    });
    return response.schedule;
  };
}

/**
 * Transforms the ergonomic tool-facing {@link CreateScheduleInput} into the
 * wire-format body Tableau's REST API expects.
 *
 * The shape of `frequencyDetails` and its `intervals` array changes per
 * frequency; we flatten the discriminated union here.
 */
function buildCreateScheduleRequestBody(input: CreateScheduleInput): {
  schedule: {
    name: string;
    type: CreateScheduleInput['type'];
    frequency: ScheduleFrequencyDetails['frequency'];
    priority?: number;
    executionOrder?: CreateScheduleInput['executionOrder'];
    frequencyDetails: {
      start: string;
      end?: string;
      intervals: {
        interval: Array<{
          hours?: string;
          minutes?: string;
          weekDay?: (typeof weekDayEnum)[number];
          monthDay?: string;
        }>;
      };
    };
  };
} {
  const { name, type, priority, executionOrder, frequencyDetails } = input;

  let interval: Array<{
    hours?: string;
    minutes?: string;
    weekDay?: (typeof weekDayEnum)[number];
    monthDay?: string;
  }>;
  let end: string | undefined;

  switch (frequencyDetails.frequency) {
    case 'Hourly':
      interval = frequencyDetails.intervals.map((i) => ({
        hours: i.hours,
        minutes: i.minutes,
      }));
      end = frequencyDetails.end;
      break;
    case 'Daily':
      // Daily schedules have no per-run interval array; Tableau still accepts
      // an empty `intervals.interval` list in the wire body.
      interval = [];
      break;
    case 'Weekly':
      interval = frequencyDetails.intervals.map((i) => ({ weekDay: i.weekDay }));
      break;
    case 'Monthly':
      interval = frequencyDetails.intervals.map((i) => ({ monthDay: i.monthDay }));
      break;
  }

  return {
    schedule: {
      name,
      type,
      frequency: frequencyDetails.frequency,
      priority,
      executionOrder,
      frequencyDetails: {
        start: frequencyDetails.start,
        end,
        intervals: { interval },
      },
    },
  };
}

export const exportedForTesting = {
  buildCreateScheduleRequestBody,
};
