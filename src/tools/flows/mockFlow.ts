import { Flow } from '../../sdks/tableau/types/flow.js';
import { FlowConnection } from '../../sdks/tableau/types/flowConnection.js';
import { FlowRun } from '../../sdks/tableau/types/flowRun.js';

export const mockFlow = {
  id: 'a1b2c3d4-1111-2222-3333-444455556666',
  name: 'Superstore Flow',
  description: 'Prep flow for the Superstore dataset.',
  webpageUrl: 'https://10ax.online.tableau.com/#/site/mcp-test/flows/1234',
  fileType: 'tflx',
  createdAt: '2024-06-10T23:23:23Z',
  updatedAt: '2024-06-10T23:23:23Z',
  project: { name: 'Samples', id: 'ae5e9374-2a58-40ab-93e4-a2fd1b07cf7d' },
  owner: { id: 'bbdee366-4a50-4c2c-a5c8-746da5b64483', name: 'admin' },
  tags: {
    tag: [
      {
        label: 'tag-1',
      },
    ],
  },
} satisfies Flow;

export const mockFlow2 = {
  id: 'f7e8d9c0-aaaa-bbbb-cccc-ddddeeeeffff',
  name: 'Finance Flow',
  fileType: 'tfl',
  createdAt: '2024-06-10T23:23:23Z',
  updatedAt: '2024-06-10T23:23:23Z',
  project: { name: 'Finance', id: '4862efd9-3c24-4053-ae1f-18caf18b6ffe' },
  owner: { id: 'cbdee366-4a50-4c2c-a5c8-746da5b64484', name: 'analyst' },
  tags: {
    tag: [
      {
        label: 'tag-2',
      },
    ],
  },
} satisfies Flow;

/**
 * A handful of flow runs. Ordered most-recent-first to mirror the Tableau
 * endpoint's contract.
 */
export const mockFlowRuns: FlowRun[] = [
  {
    id: 'run00001-0000-0000-0000-000000000001',
    flowId: mockFlow.id,
    status: 'Success',
    startedAt: '2024-06-11T03:00:00Z',
    completedAt: '2024-06-11T03:02:14Z',
    progress: '100',
    backgroundJobId: 'j0b00001-0000-0000-0000-000000000001',
  },
  {
    id: 'run00002-0000-0000-0000-000000000002',
    flowId: mockFlow.id,
    status: 'Failed',
    startedAt: '2024-06-10T03:00:00Z',
    completedAt: '2024-06-10T03:00:42Z',
    progress: '100',
    backgroundJobId: 'j0b00002-0000-0000-0000-000000000002',
  },
];

export const mockFlowConnections: FlowConnection[] = [
  {
    id: 'conn0001-0000-0000-0000-000000000001',
    type: 'postgres',
    serverAddress: 'db.example.com',
    serverPort: '5432',
    userName: 'tableau_reader',
    embedPassword: true,
    queryTaggingEnabled: false,
  },
  {
    id: 'conn0002-0000-0000-0000-000000000002',
    type: 'textscan',
    serverAddress: '',
    serverPort: '',
    userName: '',
    embedPassword: false,
  },
];
