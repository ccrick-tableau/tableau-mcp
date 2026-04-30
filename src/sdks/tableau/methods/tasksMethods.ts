import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { tasksApis } from '../apis/tasksApi.js';
import { RestApiCredentials } from '../restApi.js';
import { ExtractRefreshTask } from '../types/extractRefreshTask.js';
import { Job } from '../types/job.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Tasks methods of the Tableau Server REST API.
 *
 * @export
 * @class TasksMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm
 */
export default class TasksMethods extends AuthenticatedMethods<typeof tasksApis> {
  constructor(baseUrl: string, creds: RestApiCredentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, tasksApis, { axiosConfig }), creds);
  }

  /**
   * Returns a list of all extract refresh tasks on the specified site.
   *
   * This Tableau REST endpoint does not support pagination and returns all tasks
   * in a single response.
   *
   * Required scopes: `tableau:tasks:read`
   *
   * @param {string} siteId The Tableau site ID.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#get_extract_refresh_tasks
   */
  listExtractRefreshTasks = async ({
    siteId,
  }: {
    siteId: string;
  }): Promise<ExtractRefreshTask[]> => {
    const response = await this._apiClient.listExtractRefreshTasks({
      params: { siteId },
      ...this.authHeader,
    });
    return (response.tasks.task ?? []).map((t) => t.extractRefresh);
  };

  /**
   * Runs the specified extract refresh task and returns the job created to
   * perform the refresh. This operation is asynchronous: completion is observed
   * by querying the returned job.
   *
   * Required scopes: `tableau:tasks:run`
   *
   * @param {string} taskId The ID of the extract refresh task to run.
   * @param {string} siteId The Tableau site ID.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_jobs_tasks_and_schedules.htm#run_extract_refresh_task
   */
  runExtractRefreshTask = async ({
    taskId,
    siteId,
  }: {
    taskId: string;
    siteId: string;
  }): Promise<Job> => {
    return (
      await this._apiClient.runExtractRefreshTask(
        {},
        {
          params: { siteId, taskId },
          ...this.authHeader,
        },
      )
    ).job;
  };
}
