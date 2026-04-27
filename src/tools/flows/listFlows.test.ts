import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import { getCombinationsOfBoundedContextInputs } from '../../utils/getCombinationsOfBoundedContextInputs.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import { constrainFlows, getListFlowsTool } from './listFlows.js';
import { mockFlow, mockFlow2 } from './mockFlow.js';

const mockFlowsResponse = {
  pagination: {
    pageNumber: 1,
    pageSize: 10,
    totalAvailable: 1,
  },
  flows: [mockFlow],
};

const mocks = vi.hoisted(() => ({
  mockQueryFlowsForSite: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      flowsMethods: {
        queryFlowsForSite: mocks.mockQueryFlowsForSite,
      },
      siteId: 'test-site-id',
    }),
  ),
}));

describe('listFlowsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a tool instance with correct properties', () => {
    const listFlowsTool = getListFlowsTool(new Server());
    expect(listFlowsTool.name).toBe('list-flows');
    expect(listFlowsTool.description).toContain('Retrieves a list of flows on a Tableau site');
    expect(listFlowsTool.paramsSchema).toMatchObject({});
  });

  it('should successfully query flows', async () => {
    mocks.mockQueryFlowsForSite.mockResolvedValue(mockFlowsResponse);
    const result = await getToolResult({ filter: 'name:eq:Superstore Flow' });
    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('Superstore Flow');
    expect(mocks.mockQueryFlowsForSite).toHaveBeenCalledWith({
      siteId: 'test-site-id',
      filter: 'name:eq:Superstore Flow',
      pageSize: undefined,
      pageNumber: undefined,
    });
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'API Error';
    mocks.mockQueryFlowsForSite.mockRejectedValue(new Error(errorMessage));
    const result = await getToolResult({ filter: 'name:eq:Superstore Flow' });
    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain(errorMessage);
  });

  describe('constrainFlows', () => {
    it('should return empty result when no flows are found', () => {
      const result = constrainFlows({
        flows: [],
        boundedContext: { projectIds: null, datasourceIds: null, workbookIds: null, tags: null },
      });

      invariant(result.type === 'empty');
      expect(result.message).toBe(
        'No flows were found. Either none exist or you do not have permission to view them.',
      );
    });

    it('should return empty results when all flows were filtered out by the bounded context', () => {
      const result = constrainFlows({
        flows: [mockFlow],
        boundedContext: {
          projectIds: new Set(['some-other-project-id']),
          datasourceIds: null,
          workbookIds: null,
          tags: null,
        },
      });

      invariant(result.type === 'empty');
      expect(result.message).toBe(
        [
          'The set of allowed flows that can be queried is limited by the server configuration.',
          'While flows were found, they were all filtered out by the server configuration.',
        ].join(' '),
      );
    });

    test.each(
      getCombinationsOfBoundedContextInputs({
        projectIds: [null, new Set([mockFlow.project.id])],
        datasourceIds: [null], // n/a for flows
        workbookIds: [null], // n/a for flows
        tags: [null, new Set([mockFlow.tags.tag[0].label])],
      }),
    )(
      'should return success result when the bounded context is projectIds: $projectIds, datasourceIds: $datasourceIds, workbookIds: $workbookIds, tags: $tags',
      async ({ projectIds, datasourceIds, workbookIds, tags }) => {
        const result = constrainFlows({
          flows: [mockFlow, mockFlow2],
          boundedContext: {
            projectIds,
            datasourceIds,
            workbookIds,
            tags,
          },
        });

        invariant(result.type === 'success');
        if (!projectIds && !tags) {
          expect(result.result).toEqual([mockFlow, mockFlow2]);
        } else {
          expect(result.result).toEqual([mockFlow]);
        }
      },
    );
  });
});

async function getToolResult(params: { filter: string }): Promise<CallToolResult> {
  const listFlowsTool = getListFlowsTool(new Server());
  const callback = await Provider.from(listFlowsTool.callback);
  return await callback(
    { filter: params.filter, pageSize: undefined, limit: undefined },
    getMockRequestHandlerExtra(),
  );
}
