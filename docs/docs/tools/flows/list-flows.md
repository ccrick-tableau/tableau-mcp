---
sidebar_position: 1
---

# List Flows

Retrieves a list of Tableau Prep flows on a site.

## APIs called

- [Query Flows for Site](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#query_flows_for_site)

## Optional arguments

### `filter`

A
[filter expression](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_filtering_and_sorting.htm)
as defined in the
[Tableau REST API Flows filter fields](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_filtering_and_sorting.htm#flows).

Example: `name:eq:Superstore Flow`

<hr />

### `pageSize`

The value of the `page-size` argument provided to the
[Query Flows for Site](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#query_flows_for_site)
REST API. The tool automatically performs pagination and will repeatedly call the REST API until
either all flows are retrieved or the `limit` argument has been reached. The `pageSize` argument
will determine how many flows to return in each call. You may want to provide a larger value if you
know in advance that you have more than 100 flows to retrieve.

Example: `1000`

<hr />

### `limit`

The maximum number of flows to return. The tool will return at most this many flows.

Example: `2000`

See also: [`MAX_RESULT_LIMIT`](../../configuration/mcp-config/env-vars.md#max_result_limit)

## Example result

```json
[
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
]
```
