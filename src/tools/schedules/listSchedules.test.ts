import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { Server } from '../../server.js';
import invariant from '../../utils/invariant.js';
import { Provider } from '../../utils/provider.js';
import { getMockRequestHandlerExtra } from '../toolContext.mock.js';
import { constrainSchedules, getListSchedulesTool } from './listSchedules.js';
import { mockSchedule, mockSchedule2 } from './mockSchedule.js';

const mockSchedulesResponse = {
  pagination: {
    pageNumber: 1,
    pageSize: 10,
    totalAvailable: 2,
  },
  schedules: [mockSchedule, mockSchedule2],
};

const mocks = vi.hoisted(() => ({
  mockListSchedules: vi.fn(),
}));

vi.mock('../../restApiInstance.js', () => ({
  useRestApi: vi.fn().mockImplementation(async ({ callback }) =>
    callback({
      schedulesMethods: {
        listSchedules: mocks.mockListSchedules,
      },
      siteId: 'test-site-id',
    }),
  ),
}));

describe('listSchedulesTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a tool instance with correct properties', () => {
    const tool = getListSchedulesTool(new Server());
    expect(tool.name).toBe('list-schedules');
    expect(tool.description).toContain('Retrieves a list of schedules on a Tableau site');
    expect(tool.paramsSchema).toMatchObject({});
    expect(tool.annotations).toMatchObject({
      title: 'List Schedules',
      readOnlyHint: true,
      openWorldHint: false,
    });
  });

  it('should return the list of schedules', async () => {
    mocks.mockListSchedules.mockResolvedValue(mockSchedulesResponse);

    const result = await getToolResult({ filter: undefined });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    const parsed = JSON.parse(`${result.content[0].text}`);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe(mockSchedule.id);
    expect(parsed[1].id).toBe(mockSchedule2.id);
    expect(mocks.mockListSchedules).toHaveBeenCalledWith({
      siteId: 'test-site-id',
      filter: '',
      pageSize: undefined,
      pageNumber: undefined,
    });
  });

  it('should pass a validated filter through to the API', async () => {
    mocks.mockListSchedules.mockResolvedValue(mockSchedulesResponse);

    const result = await getToolResult({ filter: 'type:eq:Extract' });

    expect(result.isError).toBe(false);
    expect(mocks.mockListSchedules).toHaveBeenCalledWith({
      siteId: 'test-site-id',
      filter: 'type:eq:Extract',
      pageSize: undefined,
      pageNumber: undefined,
    });
  });

  it('should return an empty-message result when no schedules exist', async () => {
    mocks.mockListSchedules.mockResolvedValue({
      pagination: { pageNumber: 1, pageSize: 10, totalAvailable: 0 },
      schedules: [],
    });

    const result = await getToolResult({ filter: undefined });

    expect(result.isError).toBe(false);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('No schedules were found');
  });

  it('should handle API errors gracefully', async () => {
    mocks.mockListSchedules.mockRejectedValue(new Error('boom'));

    const result = await getToolResult({ filter: undefined });

    expect(result.isError).toBe(true);
    invariant(result.content[0].type === 'text');
    expect(result.content[0].text).toContain('boom');
  });

  describe('constrainSchedules', () => {
    it('should return empty when no schedules exist', () => {
      const result = constrainSchedules({ schedules: [] });
      invariant(result.type === 'empty');
      expect(result.message).toContain('No schedules were found');
    });

    it('should pass schedules through unchanged', () => {
      const result = constrainSchedules({ schedules: [mockSchedule, mockSchedule2] });
      invariant(result.type === 'success');
      expect(result.result).toEqual([mockSchedule, mockSchedule2]);
    });
  });
});

async function getToolResult(params: { filter: string | undefined }): Promise<CallToolResult> {
  const tool = getListSchedulesTool(new Server());
  const callback = await Provider.from(tool.callback);
  return await callback(
    { filter: params.filter, pageSize: undefined, limit: undefined },
    getMockRequestHandlerExtra(),
  );
}
