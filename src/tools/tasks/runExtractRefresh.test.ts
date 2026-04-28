import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import { stubDefaultEnvVars } from '../../testShared.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { mockJob } from '../jobs/mockJob.js';
import { exportedForTesting as resourceAccessCheckerExportedForTesting } from '../resourceAccessChecker.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import { mockExtractRefreshTask, mockExtractRefreshTask2 } from './mockExtractRefreshTask.js';
import { getRunExtractRefreshTool } from './runExtractRefresh.js';

const { resetResourceAccessCheckerSingleton } = resourceAccessCheckerExportedForTesting;

const mocks = vi.hoisted(() => ({
  mockListExtractRefreshTasks: vi.fn(),
  mockRunExtractRefreshTask: vi.fn(),
  mockGetWorkbook: vi.fn(),
  mockQueryDatasource: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      tasksMethods: {
        listExtractRefreshTasks: mocks.mockListExtractRefreshTasks,
        runExtractRefreshTask: mocks.mockRunExtractRefreshTask,
      },
      workbooksMethods: {
        getWorkbook: mocks.mockGetWorkbook,
      },
      datasourcesMethods: {
        queryDatasource: mocks.mockQueryDatasource,
      },
      siteId: 'test-site-id',
    }),
  ),
}));

describe('runExtractRefreshTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    stubDefaultEnvVars();
    resetResourceAccessCheckerSingleton();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create a tool instance with correct properties', () => {
    const tool = getRunExtractRefreshTool(new Server());
    expect(tool.name).toBe('run-extract-refresh');
    expect(tool.description).toContain('Runs the specified extract refresh task');
    expect(tool.paramsSchema).toMatchObject({ taskId: expect.any(Object) });
    expect(tool.annotations).toMatchObject({
      title: 'Run Extract Refresh',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('should run a workbook-targeted task and return the job', async () => {
    mocks.mockListExtractRefreshTasks.mockResolvedValue([mockExtractRefreshTask]);
    mocks.mockRunExtractRefreshTask.mockResolvedValue(mockJob);

    const result = await getToolResult({ taskId: mockExtractRefreshTask.id });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    expect(JSON.parse(`${result.content[0].text}`)).toMatchObject({ id: mockJob.id });
    expect(mocks.mockRunExtractRefreshTask).toHaveBeenCalledWith({
      taskId: mockExtractRefreshTask.id,
      siteId: 'test-site-id',
    });
  });

  it('should run a datasource-targeted task and return the job', async () => {
    mocks.mockListExtractRefreshTasks.mockResolvedValue([mockExtractRefreshTask2]);
    mocks.mockRunExtractRefreshTask.mockResolvedValue(mockJob);

    const result = await getToolResult({ taskId: mockExtractRefreshTask2.id });

    expect(result.isError).toBe(false);
    expect(mocks.mockRunExtractRefreshTask).toHaveBeenCalledWith({
      taskId: mockExtractRefreshTask2.id,
      siteId: 'test-site-id',
    });
  });

  it('should return not-found if the task id does not match any task', async () => {
    mocks.mockListExtractRefreshTasks.mockResolvedValue([mockExtractRefreshTask]);

    const result = await getToolResult({ taskId: 'nonexistent' });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain(
      'The extract refresh task with LUID nonexistent was not found',
    );
    expect(mocks.mockRunExtractRefreshTask).not.toHaveBeenCalled();
  });

  it('should refuse to run when the target workbook is not allowed via INCLUDE_WORKBOOK_IDS', async () => {
    vi.stubEnv('INCLUDE_WORKBOOK_IDS', 'some-other-workbook-id');
    mocks.mockListExtractRefreshTasks.mockResolvedValue([mockExtractRefreshTask]);

    const result = await getToolResult({ taskId: mockExtractRefreshTask.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain(
      `The extract refresh task with LUID ${mockExtractRefreshTask.id} cannot be run because its target workbook is not allowed.`,
    );
    expect(mocks.mockRunExtractRefreshTask).not.toHaveBeenCalled();
  });

  it('should refuse to run when the target datasource is not allowed via INCLUDE_DATASOURCE_IDS', async () => {
    vi.stubEnv('INCLUDE_DATASOURCE_IDS', 'some-other-datasource-id');
    mocks.mockListExtractRefreshTasks.mockResolvedValue([mockExtractRefreshTask2]);

    const result = await getToolResult({ taskId: mockExtractRefreshTask2.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain(
      `The extract refresh task with LUID ${mockExtractRefreshTask2.id} cannot be run because its target datasource is not allowed.`,
    );
    expect(mocks.mockRunExtractRefreshTask).not.toHaveBeenCalled();
  });

  it('should surface a list-tasks failure', async () => {
    mocks.mockListExtractRefreshTasks.mockRejectedValue(new Error('tasks api down'));

    const result = await getToolResult({ taskId: mockExtractRefreshTask.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('tasks api down');
    expect(mocks.mockRunExtractRefreshTask).not.toHaveBeenCalled();
  });

  it('should surface a run failure', async () => {
    mocks.mockListExtractRefreshTasks.mockResolvedValue([mockExtractRefreshTask]);
    mocks.mockRunExtractRefreshTask.mockRejectedValue(new Error('backgrounder full'));

    const result = await getToolResult({ taskId: mockExtractRefreshTask.id });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('backgrounder full');
  });
});

async function getToolResult(params: { taskId: string }): Promise<CallToolResult> {
  const tool = getRunExtractRefreshTool(new Server());
  const callback = await Provider.from(tool.callback);
  return await callback(params, getMockRequestHandlerExtra());
}
