export const toolNames = [
  'list-datasources',
  'list-workbooks',
  'list-views',
  'list-custom-views',
  'list-flows',
  'list-extract-refresh-tasks',
  'list-schedules',
  'query-datasource',
  'get-datasource-metadata',
  'get-workbook',
  'get-view-data',
  'get-view-image',
  'get-custom-view-data',
  'get-custom-view-image',
  'get-flow',
  'get-job',
  'run-flow',
  'run-extract-refresh',
  'create-schedule',
  'list-all-pulse-metric-definitions',
  'list-pulse-metric-definitions-from-definition-ids',
  'list-pulse-metrics-from-metric-definition-id',
  'list-pulse-metrics-from-metric-ids',
  'list-pulse-metric-subscriptions',
  'generate-pulse-metric-value-insight-bundle',
  'generate-pulse-insight-brief',
  'search-content',
  'revoke-access-token',
  'reset-consent',
] as const;
export type ToolName = (typeof toolNames)[number];

export const toolGroupNames = [
  'datasource',
  'workbook',
  'view',
  'flow',
  'job',
  'task',
  'schedule',
  'pulse',
  'content-exploration',
  'token-management',
] as const;
export type ToolGroupName = (typeof toolGroupNames)[number];

export const toolGroups = {
  datasource: ['list-datasources', 'get-datasource-metadata', 'query-datasource'],
  workbook: ['list-workbooks', 'get-workbook'],
  view: [
    'list-views',
    'list-custom-views',
    'get-view-data',
    'get-view-image',
    'get-custom-view-data',
    'get-custom-view-image',
  ],
  flow: ['list-flows', 'get-flow', 'run-flow'],
  job: ['get-job'],
  task: ['list-extract-refresh-tasks', 'run-extract-refresh'],
  schedule: ['list-schedules', 'create-schedule'],
  pulse: [
    'list-all-pulse-metric-definitions',
    'list-pulse-metric-definitions-from-definition-ids',
    'list-pulse-metrics-from-metric-definition-id',
    'list-pulse-metrics-from-metric-ids',
    'list-pulse-metric-subscriptions',
    'generate-pulse-metric-value-insight-bundle',
    'generate-pulse-insight-brief',
  ],
  'content-exploration': ['search-content'],
  'token-management': ['revoke-access-token', 'reset-consent'],
} as const satisfies Record<ToolGroupName, Array<ToolName>>;

export function isToolName(value: unknown): value is ToolName {
  return !!toolNames.find((name) => name === value);
}

export function isToolGroupName(value: unknown): value is ToolGroupName {
  return !!toolGroupNames.find((name) => name === value);
}
