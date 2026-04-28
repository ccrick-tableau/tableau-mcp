import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import { getGetJobTool } from './getJob.js';
import { mockCompletedJob, mockJob } from './mockJob.js';

const mocks = vi.hoisted(() => ({
  mockQueryJob: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      jobsMethods: {
        queryJob: mocks.mockQueryJob,
      },
      siteId: 'test-site-id',
    }),
  ),
}));

describe('getJobTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a tool instance with correct properties', () => {
    const getJobTool = getGetJobTool(new Server());
    expect(getJobTool.name).toBe('get-job');
    expect(getJobTool.description).toContain('Returns the current status');
    expect(getJobTool.paramsSchema).toMatchObject({ jobId: expect.any(Object) });
    expect(getJobTool.annotations).toMatchObject({
      title: 'Get Job',
      readOnlyHint: true,
      openWorldHint: false,
    });
  });

  it('should return a running job', async () => {
    mocks.mockQueryJob.mockResolvedValue(mockJob);

    const result = await getToolResult({ jobId: mockJob.id });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed).toMatchObject({ id: mockJob.id, progress: '0' });
    expect(parsed.completedAt).toBeUndefined();
    expect(mocks.mockQueryJob).toHaveBeenCalledWith({
      jobId: mockJob.id,
      siteId: 'test-site-id',
    });
  });

  it('should return a completed job including finishCode', async () => {
    mocks.mockQueryJob.mockResolvedValue(mockCompletedJob);

    const result = await getToolResult({ jobId: mockCompletedJob.id });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed).toMatchObject({
      id: mockCompletedJob.id,
      progress: '100',
      finishCode: '0',
    });
  });

  it('should handle API errors gracefully', async () => {
    mocks.mockQueryJob.mockRejectedValue(new Error('job not found'));

    const result = await getToolResult({ jobId: 'bogus' });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('job not found');
  });
});

async function getToolResult(params: { jobId: string }): Promise<CallToolResult> {
  const getJobTool = getGetJobTool(new Server());
  const callback = await Provider.from(getJobTool.callback);
  return await callback(params, getMockRequestHandlerExtra());
}
