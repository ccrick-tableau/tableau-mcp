import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { jobsApis } from '../apis/jobsApi.js';
import { RestApiCredentials } from '../restApi.js';
import { Job } from '../types/job.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Jobs methods of the Tableau Server REST API.
 *
 * @export
 * @class JobsMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm
 */
export default class JobsMethods extends AuthenticatedMethods<typeof jobsApis> {
  constructor(baseUrl: string, creds: RestApiCredentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, jobsApis, { axiosConfig }), creds);
  }

  /**
   * Returns the status of an asynchronous process (job).
   *
   * Required scopes: `tableau:jobs:read`
   *
   * @param {string} jobId The ID of the job to query.
   * @param {string} siteId The Tableau site ID.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#query_job
   */
  queryJob = async ({ jobId, siteId }: { jobId: string; siteId: string }): Promise<Job> => {
    return (
      await this._apiClient.queryJob({
        params: { siteId, jobId },
        ...this.authHeader,
      })
    ).job;
  };
}
