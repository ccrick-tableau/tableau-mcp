---
sidebar_position: 2
---

# Get Flow

Retrieves information about the specified Tableau Prep flow, including its project, owner, and tags.

By default the result is enriched with the flow's recent run history and its input connections, so
agents can answer operational questions ("is this flow healthy?", "what does it read from?")
without additional tool calls.

## APIs called

- [Query Flow](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#query_flow)
- [Get Flow Runs](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#get_flow_runs)
  (when `includeFlowRuns` is true, the default)
- [Get Flow Connections](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#get_flow_connections)
  (when `includeConnections` is true, the default)

## Required arguments

### `flowId`

The ID of the flow, potentially retrieved by the [List Flows](list-flows.md) tool.

Example: `a1b2c3d4-1111-2222-3333-444455556666`

## Optional arguments

### `includeFlowRuns`

Boolean, defaults to `true`. When true, the response includes up to `flowRunLimit` most-recent
flow runs in a `flowRuns` array.

### `includeConnections`

Boolean, defaults to `true`. When true, the response includes the flow's input data connections
in a `connections` array.

### `flowRunLimit`

Integer `1..50`, defaults to `10`. The maximum number of recent flow runs to return. Only applies
when `includeFlowRuns` is true.

## Enrichment failure handling

Each enrichment fetch is best-effort. If the flow-runs or connections endpoint returns an error
(e.g. a transient failure or a missing permission), the corresponding array is returned **empty**
and a warning is logged — the base flow result is still returned so the tool call does not fail.

## Example result (default enrichment)

```json
{
  "id": "a1b2c3d4-1111-2222-3333-444455556666",
  "name": "Superstore Flow",
  "description": "Prep flow for the Superstore dataset.",
  "webpageUrl": "https://10ax.online.tableau.com/#/site/mcp-test/flows/1234",
  "fileType": "tflx",
  "createdAt": "2024-06-10T23:23:23Z",
  "updatedAt": "2024-06-10T23:23:23Z",
  "project": {
    "name": "Samples",
    "id": "ae5e9374-2a58-40ab-93e4-a2fd1b07cf7d"
  },
  "owner": {
    "id": "bbdee366-4a50-4c2c-a5c8-746da5b64483",
    "name": "admin"
  },
  "tags": {},
  "flowRuns": [
    {
      "id": "run00001-0000-0000-0000-000000000001",
      "flowId": "a1b2c3d4-1111-2222-3333-444455556666",
      "status": "Success",
      "startedAt": "2024-06-11T03:00:00Z",
      "completedAt": "2024-06-11T03:02:14Z",
      "progress": "100",
      "backgroundJobId": "j0b00001-0000-0000-0000-000000000001"
    },
    {
      "id": "run00002-0000-0000-0000-000000000002",
      "flowId": "a1b2c3d4-1111-2222-3333-444455556666",
      "status": "Failed",
      "startedAt": "2024-06-10T03:00:00Z",
      "completedAt": "2024-06-10T03:00:42Z",
      "progress": "100",
      "backgroundJobId": "j0b00002-0000-0000-0000-000000000002"
    }
  ],
  "connections": [
    {
      "id": "conn0001-0000-0000-0000-000000000001",
      "type": "postgres",
      "serverAddress": "db.example.com",
      "serverPort": "5432",
      "userName": "tableau_reader",
      "embedPassword": true,
      "queryTaggingEnabled": false
    }
  ]
}
```

The `backgroundJobId` on each flow run can be passed to the
[Get Job](../jobs/get-job.md) tool for deeper status detail.

## Example result (enrichment disabled)

When called with `includeFlowRuns: false` and `includeConnections: false`, the result is the
base flow resource only:

```json
{
  "id": "a1b2c3d4-1111-2222-3333-444455556666",
  "name": "Superstore Flow",
  "project": { "name": "Samples", "id": "..." },
  "owner": { "id": "...", "name": "admin" },
  "tags": {}
}
```
