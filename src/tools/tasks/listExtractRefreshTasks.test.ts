import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import {
  constrainExtractRefreshTasks,
  getListExtractRefreshTasksTool,
} from './listExtractRefreshTasks.js';
import { mockExtractRefreshTask, mockExtractRefreshTask2 } from './mockExtractRefreshTask.js';

const mocks = vi.hoisted(() => ({
  mockListExtractRefreshTasks: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      tasksMethods: {
        listExtractRefreshTasks: mocks.mockListExtractRefreshTasks,
      },
      siteId: 'test-site-id',
    }),
  ),
}));

describe('listExtractRefreshTasksTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a tool instance with correct properties', () => {
    const tool = getListExtractRefreshTasksTool(new Server());
    expect(tool.name).toBe('list-extract-refresh-tasks');
    expect(tool.description).toContain('extract refresh tasks');
    expect(tool.paramsSchema).toMatchObject({});
    expect(tool.annotations).toMatchObject({
      title: 'List Extract Refresh Tasks',
      readOnlyHint: true,
      openWorldHint: false,
    });
  });

  it('should return the list of tasks', async () => {
    mocks.mockListExtractRefreshTasks.mockResolvedValue([
      mockExtractRefreshTask,
      mockExtractRefreshTask2,
    ]);

    const result = await getToolResult();

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe(mockExtractRefreshTask.id);
    expect(parsed[1].id).toBe(mockExtractRefreshTask2.id);
  });

  it('should handle API errors gracefully', async () => {
    mocks.mockListExtractRefreshTasks.mockRejectedValue(new Error('boom'));

    const result = await getToolResult();

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('boom');
  });

  describe('constrainExtractRefreshTasks', () => {
    it('should return empty when no tasks exist', () => {
      const result = constrainExtractRefreshTasks({
        tasks: [],
        boundedContext: { projectIds: null, datasourceIds: null, workbookIds: null, tags: null },
      });
      invariant(result.type === 'empty');
      expect(result.message).toContain('No extract refresh tasks were found');
    });

    it('should keep all tasks when no bounded context is set', () => {
      const result = constrainExtractRefreshTasks({
        tasks: [mockExtractRefreshTask, mockExtractRefreshTask2],
        boundedContext: { projectIds: null, datasourceIds: null, workbookIds: null, tags: null },
      });
      invariant(result.type === 'success');
      expect(result.result).toHaveLength(2);
    });

    it('should filter out tasks whose workbook is not allowed', () => {
      const result = constrainExtractRefreshTasks({
        tasks: [mockExtractRefreshTask, mockExtractRefreshTask2],
        boundedContext: {
          projectIds: null,
          datasourceIds: null,
          workbookIds: new Set(['some-other-workbook-id']),
          tags: null,
        },
      });
      // Workbook-targeted task removed; datasource-targeted task passes through
      // because workbookIds only filters workbook tasks.
      invariant(result.type === 'success');
      expect(result.result.map((t) => t.id)).toEqual([mockExtractRefreshTask2.id]);
    });

    it('should filter out tasks whose datasource is not allowed', () => {
      const result = constrainExtractRefreshTasks({
        tasks: [mockExtractRefreshTask, mockExtractRefreshTask2],
        boundedContext: {
          projectIds: null,
          datasourceIds: new Set(['some-other-datasource-id']),
          workbookIds: null,
          tags: null,
        },
      });
      invariant(result.type === 'success');
      expect(result.result.map((t) => t.id)).toEqual([mockExtractRefreshTask.id]);
    });

    it('should return empty when everything was filtered out', () => {
      const result = constrainExtractRefreshTasks({
        tasks: [mockExtractRefreshTask, mockExtractRefreshTask2],
        boundedContext: {
          projectIds: null,
          datasourceIds: new Set(['some-other-datasource-id']),
          workbookIds: new Set(['some-other-workbook-id']),
          tags: null,
        },
      });
      invariant(result.type === 'empty');
      expect(result.message).toContain('filtered out by the server configuration');
    });
  });
});

async function getToolResult(): Promise<CallToolResult> {
  const tool = getListExtractRefreshTasksTool(new Server());
  const callback = await Provider.from(tool.callback);
  return await callback({}, getMockRequestHandlerExtra());
}
