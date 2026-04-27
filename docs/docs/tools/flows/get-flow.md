---
sidebar_position: 2
---

# Get Flow

Retrieves information about the specified Tableau Prep flow, including its project, owner, and
tags.

## APIs called

- [Query Flow](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#query_flow)

## Required arguments

### `flowId`

The ID of the flow, potentially retrieved by the [List Flows](list-flows.md) tool.

Example: `a1b2c3d4-1111-2222-3333-444455556666`

## Example result

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
  "tags": {}
}
```
