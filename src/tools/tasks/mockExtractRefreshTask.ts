import { ExtractRefreshTask } from '../../sdks/tableau/types/extractRefreshTask.js';

// Workbook-targeted task
export const mockExtractRefreshTask = {
  id: 'task1111-aaaa-bbbb-cccc-dddd00000001',
  type: 'FullRefresh',
  priority: 50,
  consecutiveFailedCount: 0,
  schedule: {
    id: 'sched000-aaaa-bbbb-cccc-dddd00000001',
    name: 'Daily 3am',
    state: 'Active',
    priority: 50,
    frequency: 'Daily',
    nextRunAt: '2024-06-11T03:00:00Z',
  },
  workbook: { id: '96a43833-27db-40b6-aa80-751efc776b9a' },
} satisfies ExtractRefreshTask;

// Datasource-targeted task
export const mockExtractRefreshTask2 = {
  id: 'task1111-aaaa-bbbb-cccc-dddd00000002',
  type: 'IncrementalRefresh',
  priority: 25,
  consecutiveFailedCount: 1,
  schedule: {
    id: 'sched000-aaaa-bbbb-cccc-dddd00000002',
    name: 'Hourly',
    state: 'Active',
    priority: 25,
    frequency: 'Hourly',
  },
  datasource: { id: '2d935df8-fe7e-4fd8-bb14-35eb4ba31d45' },
} satisfies ExtractRefreshTask;
