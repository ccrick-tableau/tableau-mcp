import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { schedulesApis } from '../apis/schedulesApi.js';
import { RestApiCredentials } from '../restApi.js';
import { Pagination } from '../types/pagination.js';
import { Schedule } from '../types/schedule.js';
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
}
