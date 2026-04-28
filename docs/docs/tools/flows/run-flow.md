---
sidebar_position: 3
---

# Run Flow

Runs the specified Tableau Prep flow and returns the job created to perform the run.

The run is executed asynchronously on the Tableau site. This tool returns the job immediately
without waiting for completion. Use the [Get Job](../jobs/get-job.md) tool to observe progress and
final status.

## APIs called

- [Query Flow](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#query_flow)
  (used to verify permissions before running)
- [Run Flow Now](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#run_flow_now)

## Required arguments

### `flowId`

The LUID of the flow to run, typically retrieved from the [List Flows](list-flows.md) or
[Get Flow](get-flow.md) tool.

Example: `a1b2c3d4-1111-2222-3333-444455556666`

## Side effects

- Running a flow overwrites its output datasources and records a new entry in the flow's run
  history.
- Re-running a flow is not equivalent to running it once; each invocation produces new output
  artifacts and consumes a Tableau backgrounder job slot.

## Example result

```json
{
  "id": "j0b1d2e3-ffff-0000-1111-222233334444",
  "mode": "Asynchronous",
  "type": "RunFlow",
  "progress": "0",
  "createdAt": "2024-06-10T23:23:23Z"
}
```

Pass the returned `id` to the [Get Job](../jobs/get-job.md) tool to poll for completion.
