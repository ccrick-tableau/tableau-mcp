import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import { stubDefaultEnvVars } from '../../testShared.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import { applyBoundedContextToFlow, getGetFlowTool } from './getFlow.js';
import { mockFlow } from './mockFlow.js';

const mocks = vi.hoisted(() => ({
  mockGetFlow: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      flowsMethods: {
        getFlow: mocks.mockGetFlow,
      },
      siteId: 'test-site-id',
    }),
  ),
}));

describe('getFlowTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    stubDefaultEnvVars();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create a tool instance with correct properties', () => {
    const getFlowTool = getGetFlowTool(new Server());
    expect(getFlowTool.name).toBe('get-flow');
    expect(getFlowTool.description).toContain('Retrieves information about the specified');
    expect(getFlowTool.paramsSchema).toMatchObject({ flowId: expect.any(Object) });
  });

  it('should successfully get flow', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);
    const result = await getToolResult({ flowId: mockFlow.id });
    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('Superstore Flow');
    expect(mocks.mockGetFlow).toHaveBeenCalledWith({
      siteId: 'test-site-id',
      flowId: mockFlow.id,
    });
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'API Error';
    mocks.mockGetFlow.mockRejectedValue(new Error(errorMessage));
    const result = await getToolResult({ flowId: mockFlow.id });
    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain(errorMessage);
  });

  describe('applyBoundedContextToFlow', () => {
    it('should return the flow when no filtering occurs', () => {
      const result = applyBoundedContextToFlow({
        flow: mockFlow,
        boundedContext: {
          projectIds: null,
          datasourceIds: null,
          workbookIds: null,
          tags: null,
        },
      });
      invariant(result.type === 'success');
      expect(result.result).toEqual(mockFlow);
    });

    it('should return the flow when its project is in the allowed projectIds', () => {
      const result = applyBoundedContextToFlow({
        flow: mockFlow,
        boundedContext: {
          projectIds: new Set([mockFlow.project.id]),
          datasourceIds: null,
          workbookIds: null,
          tags: null,
        },
      });
      invariant(result.type === 'success');
      expect(result.result).toEqual(mockFlow);
    });

    it('should return an error when the project is not in the allowed projectIds', () => {
      const result = applyBoundedContextToFlow({
        flow: mockFlow,
        boundedContext: {
          projectIds: new Set(['some-other-project-id']),
          datasourceIds: null,
          workbookIds: null,
          tags: null,
        },
      });
      invariant(result.type === 'error');
      expect(result.message).toBe(
        [
          'The set of allowed flows that can be queried is limited by the server configuration.',
          `The flow with LUID ${mockFlow.id} cannot be queried because it does not belong to an allowed project.`,
        ].join(' '),
      );
    });

    it('should return the flow when it has one of the allowed tags', () => {
      const result = applyBoundedContextToFlow({
        flow: mockFlow,
        boundedContext: {
          projectIds: null,
          datasourceIds: null,
          workbookIds: null,
          tags: new Set([mockFlow.tags.tag[0].label]),
        },
      });
      invariant(result.type === 'success');
      expect(result.result).toEqual(mockFlow);
    });

    it('should return an error when the flow does not have one of the allowed tags', () => {
      const result = applyBoundedContextToFlow({
        flow: mockFlow,
        boundedContext: {
          projectIds: null,
          datasourceIds: null,
          workbookIds: null,
          tags: new Set(['some-other-tag']),
        },
      });
      invariant(result.type === 'error');
      expect(result.message).toBe(
        [
          'The set of allowed flows that can be queried is limited by the server configuration.',
          `The flow with LUID ${mockFlow.id} cannot be queried because it does not have one of the allowed tags.`,
        ].join(' '),
      );
    });
  });
});

async function getToolResult(params: { flowId: string }): Promise<CallToolResult> {
  const getFlowTool = getGetFlowTool(new Server());
  const callback = await Provider.from(getFlowTool.callback);
  return await callback(params, getMockRequestHandlerExtra());
}
