import { Zodios } from '@zodios/core';

import { AxiosRequestConfig } from '../../../utils/axios.js';
import { flowsApis } from '../apis/flowsApi.js';
import { RestApiCredentials } from '../restApi.js';
import { Flow } from '../types/flow.js';
import { Job } from '../types/job.js';
import { Pagination } from '../types/pagination.js';
import AuthenticatedMethods from './authenticatedMethods.js';

/**
 * Flows methods of the Tableau Server REST API
 *
 * @export
 * @class FlowsMethods
 * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm
 */
export default class FlowsMethods extends AuthenticatedMethods<typeof flowsApis> {
  constructor(baseUrl: string, creds: RestApiCredentials, axiosConfig: AxiosRequestConfig) {
    super(new Zodios(baseUrl, flowsApis, { axiosConfig }), creds);
  }

  /**
   * Returns information about the specified flow, including information about the project and owner.
   *
   * Required scopes: `tableau:content:read`
   *
   * @param {string} flowId The ID of the flow to return information for.
   * @param {string} siteId - The Tableau site ID
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#query_flow
   */
  getFlow = async ({ flowId, siteId }: { flowId: string; siteId: string }): Promise<Flow> => {
    return (
      await this._apiClient.getFlow({
        params: { siteId, flowId },
        ...this.authHeader,
      })
    ).flow;
  };

  /**
   * Returns the flows on a site.
   *
   * Required scopes: `tableau:content:read`
   *
   * @param siteId - The Tableau site ID
   * @param filter - The filter string to filter flows by
   * @param pageSize - The number of items to return in one response. The minimum is 1. The maximum is 1000. The default is 100.
   * @param pageNumber - The offset for paging. The default is 1.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#query_flows_for_site
   */
  queryFlowsForSite = async ({
    siteId,
    filter,
    pageSize,
    pageNumber,
  }: {
    siteId: string;
    filter: string;
    pageSize?: number;
    pageNumber?: number;
  }): Promise<{ pagination: Pagination; flows: Flow[] }> => {
    const response = await this._apiClient.queryFlowsForSite({
      params: { siteId },
      queries: { filter, pageSize, pageNumber },
      ...this.authHeader,
    });
    return {
      pagination: response.pagination,
      flows: response.flows.flow ?? [],
    };
  };

  /**
   * Runs the specified flow and returns the job created to perform the run.
   * This operation is asynchronous: completion is observed by querying the
   * returned job.
   *
   * Required scopes: `tableau:tasks:run`
   *
   * @param {string} flowId The ID of the flow to run.
   * @param {string} siteId The Tableau site ID.
   * @link https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#run_flow_now
   */
  runFlowNow = async ({ flowId, siteId }: { flowId: string; siteId: string }): Promise<Job> => {
    return (
      await this._apiClient.runFlowNow(
        {},
        {
          params: { siteId, flowId },
          ...this.authHeader,
        },
      )
    ).job;
  };
}
