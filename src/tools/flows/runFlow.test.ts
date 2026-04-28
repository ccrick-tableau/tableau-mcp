import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import { stubDefaultEnvVars } from '../../testShared.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { mockJob } from '../jobs/mockJob.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import { mockFlow } from './mockFlow.js';
import { getRunFlowTool } from './runFlow.js';

const mocks = vi.hoisted(() => ({
  mockGetFlow: vi.fn(),
  mockRunFlowNow: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      flowsMethods: {
        getFlow: mocks.mockGetFlow,
        runFlowNow: mocks.mockRunFlowNow,
      },
      siteId: 'test-site-id',
    }),
  ),
}));

describe('runFlowTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    stubDefaultEnvVars();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create a tool instance with correct properties', () => {
    const runFlowTool = getRunFlowTool(new Server());
    expect(runFlowTool.name).toBe('run-flow');
    expect(runFlowTool.description).toContain('Runs the specified Tableau Prep flow');
    expect(runFlowTool.paramsSchema).toMatchObject({ flowId: expect.any(Object) });
  });

  it('should have write-intent annotations', () => {
    const runFlowTool = getRunFlowTool(new Server());
    expect(runFlowTool.annotations).toMatchObject({
      title: 'Run Flow',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('should run the flow and return the job', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);
    mocks.mockRunFlowNow.mockResolvedValue(mockJob);

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    expect(JSON.parse(`${result.content[0].text}`)).toMatchObject({
      id: mockJob.id,
      type: 'RunFlow',
    });
    expect(mocks.mockRunFlowNow).toHaveBeenCalledWith({
      flowId: mockFlow.id,
      siteId: 'test-site-id',
    });
  });

  it('should refuse to run a flow that is not in an allowed project', async () => {
    vi.stubEnv('INCLUDE_PROJECT_IDS', 'some-other-project-id');
    mocks.mockGetFlow.mockResolvedValue(mockFlow);

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain(`The flow with LUID ${mockFlow.id} is not allowed`);
    expect(mocks.mockRunFlowNow).not.toHaveBeenCalled();
  });

  it('should refuse to run a flow that does not have one of the allowed tags', async () => {
    vi.stubEnv('INCLUDE_TAGS', 'some-other-tag');
    mocks.mockGetFlow.mockResolvedValue(mockFlow);

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain(`The flow with LUID ${mockFlow.id} is not allowed`);
    expect(mocks.mockRunFlowNow).not.toHaveBeenCalled();
  });

  it('should surface an error if the flow lookup fails', async () => {
    mocks.mockGetFlow.mockRejectedValue(new Error('flow not found'));

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('Unable to verify permissions');
    expect(mocks.mockRunFlowNow).not.toHaveBeenCalled();
  });

  it('should surface API errors from the run itself', async () => {
    mocks.mockGetFlow.mockResolvedValue(mockFlow);
    mocks.mockRunFlowNow.mockRejectedValue(new Error('backgrounder unavailable'));

    const result = await getToolResult({ flowId: mockFlow.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('backgrounder unavailable');
  });
});

async function getToolResult(params: { flowId: string }): Promise<CallToolResult> {
  const runFlowTool = getRunFlowTool(new Server());
  const callback = await Provider.from(runFlowTool.callback);
  return await callback(params, getMockRequestHandlerExtra());
}
