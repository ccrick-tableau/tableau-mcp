import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { Server } from '../../server.js';
import { stubDefaultEnvVars } from '../../testShared.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import { applyBoundedContextToFlow, getGetFlowTool } from './getFlow.js';
import { mockFlow, mockFlowConnections, mockFlowRuns } from './mockFlow.js';

const mocks = vi.hoisted(() => ({
  mockGetFlow: vi.fn(),
  mockGetFlowRuns: vi.fn(),
  mockGetFlowConnections: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      flowsMethods: {
        getFlow: mocks.mockGetFlow,
        getFlowRuns: mocks.mockGetFlowRuns,
        getFlowConnections: mocks.mockGetFlowConnections,
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
    // Default enrichment responses; individual tests override as needed.
    mocks.mockGetFlowRuns.mockResolvedValue(mockFlowRuns);
    mocks.mockGetFlowConnections.mockResolvedValue(mockFlowConnections);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create a tool instance with correct properties', () => {
    const getFlowTool = getGetFlowTool(new Server());
    expect(getFlowTool.name).toBe('get-flow');
    expect(getFlowTool.description).toContain('Retrieves information about the specified');
    expect(getFlowTool.paramsSchema).toMatchObject({
      flowId: expect.any(Object),
      includeFlowRuns: expect.any(Object),
      includeConnections: expect.any(Object),
      flowRunLimit: expect.any(Object),
    });
  });

  it('should enrich with flowRuns and connections by default', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed.id).toBe(mockFlow.id);
    expect(parsed.flowRuns).toHaveLength(mockFlowRuns.length);
    expect(parsed.flowRuns[0]).toMatchObject({
      id: mockFlowRuns[0].id,
      status: 'Success',
    });
    expect(parsed.connections).toHaveLength(mockFlowConnections.length);
    expect(parsed.connections[0]).toMatchObject({
      id: mockFlowConnections[0].id,
      type: 'postgres',
    });
    expect(mocks.mockGetFlowRuns).toHaveBeenCalledWith({
      flowId: mockFlow.id,
      siteId: 'test-site-id',
    });
    expect(mocks.mockGetFlowConnections).toHaveBeenCalledWith({
      flowId: mockFlow.id,
      siteId: 'test-site-id',
    });
  });

  it('should skip flowRuns enrichment when includeFlowRuns is false', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);

    const result = await getToolResult({ flowId: mockFlow.id, includeFlowRuns: false });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed.flowRuns).toBeUndefined();
    expect(parsed.connections).toBeDefined();
    expect(mocks.mockGetFlowRuns).not.toHaveBeenCalled();
    expect(mocks.mockGetFlowConnections).toHaveBeenCalled();
  });

  it('should skip connections enrichment when includeConnections is false', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);

    const result = await getToolResult({ flowId: mockFlow.id, includeConnections: false });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed.connections).toBeUndefined();
    expect(parsed.flowRuns).toBeDefined();
    expect(mocks.mockGetFlowConnections).not.toHaveBeenCalled();
    expect(mocks.mockGetFlowRuns).toHaveBeenCalled();
  });

  it('should skip both enrichments when both flags are false', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);

    const result = await getToolResult({
      flowId: mockFlow.id,
      includeFlowRuns: false,
      includeConnections: false,
    });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed.flowRuns).toBeUndefined();
    expect(parsed.connections).toBeUndefined();
    expect(mocks.mockGetFlowRuns).not.toHaveBeenCalled();
    expect(mocks.mockGetFlowConnections).not.toHaveBeenCalled();
  });

  it('should respect flowRunLimit by slicing the runs array', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);
    // Provide more runs than the default limit to make sure slicing is real.
    const manyRuns = Array.from({ length: 20 }, (_, i) => ({
      ...mockFlowRuns[0],
      id: `run-${i}`,
    }));
    mocks.mockGetFlowRuns.mockResolvedValue(manyRuns);

    const result = await getToolResult({ flowId: mockFlow.id, flowRunLimit: 3 });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed.flowRuns).toHaveLength(3);
    expect(parsed.flowRuns.map((r: { id: string }) => r.id)).toEqual(['run-0', 'run-1', 'run-2']);
  });

  it('should apply a default flowRunLimit of 10 when not specified', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);
    const manyRuns = Array.from({ length: 25 }, (_, i) => ({
      ...mockFlowRuns[0],
      id: `run-${i}`,
    }));
    mocks.mockGetFlowRuns.mockResolvedValue(manyRuns);

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed.flowRuns).toHaveLength(10);
  });

  it('should continue and return the flow with an empty flowRuns array if that enrichment fails', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);
    mocks.mockGetFlowRuns.mockRejectedValue(new Error('runs endpoint unavailable'));

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed.id).toBe(mockFlow.id);
    expect(parsed.flowRuns).toEqual([]);
    expect(parsed.connections).toHaveLength(mockFlowConnections.length);
  });

  it('should continue and return the flow with an empty connections array if that enrichment fails', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);
    mocks.mockGetFlowConnections.mockRejectedValue(new Error('connections endpoint unavailable'));

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed.id).toBe(mockFlow.id);
    expect(parsed.connections).toEqual([]);
    expect(parsed.flowRuns).toHaveLength(mockFlowRuns.length);
  });

  it('should still error if the base get-flow call fails', async () => {
    mocks.mockGetFlow.mockRejectedValue(new Error('flow not found'));

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('flow not found');
    expect(mocks.mockGetFlowRuns).not.toHaveBeenCalled();
    expect(mocks.mockGetFlowConnections).not.toHaveBeenCalled();
  });

  it('should skip enrichment entirely for a flow rejected by the bounded context', async () => {
    vi.stubEnv('INCLUDE_PROJECT_IDS', 'some-other-project-id');
    mocks.mockGetFlow.mockResolvedValue(mockFlow);

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain(
      `The flow with LUID ${mockFlow.id} cannot be queried because it does not belong to an allowed project.`,
    );
    expect(mocks.mockGetFlowRuns).not.toHaveBeenCalled();
    expect(mocks.mockGetFlowConnections).not.toHaveBeenCalled();
  });

  it('should reject a flowRunLimit above the max via the params Zod schema', () => {
    const tool = getGetFlowTool(new Server());
    // paramsSchema is a ZodRawShape; build an object schema to validate.
    const schema = z.object(tool.paramsSchema as z.ZodRawShape);
    const badResult = schema.safeParse({
      flowId: mockFlow.id,
      flowRunLimit: 999,
    });
    expect(badResult.success).toBe(false);

    const goodResult = schema.safeParse({
      flowId: mockFlow.id,
      flowRunLimit: 10,
    });
    expect(goodResult.success).toBe(true);
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

async function getToolResult(params: {
  flowId: string;
  includeFlowRuns?: boolean;
  includeConnections?: boolean;
  flowRunLimit?: number;
}): Promise<CallToolResult> {
  const getFlowTool = getGetFlowTool(new Server());
  const callback = await Provider.from(getFlowTool.callback);
  return await callback(
    {
      flowId: params.flowId,
      includeFlowRuns: params.includeFlowRuns,
      includeConnections: params.includeConnections,
      flowRunLimit: params.flowRunLimit,
    },
    getMockRequestHandlerExtra(),
  );
}
