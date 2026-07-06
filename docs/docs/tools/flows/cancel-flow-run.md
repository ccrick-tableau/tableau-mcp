---
sidebar_position: 7
---

# Cancel Flow Run

Cancels an **in-progress Tableau Prep flow run**, by flow _run_ id (not flow id). This is the
counterpart to [Run Flow](run-flow.md) / [Run Flow Task](run-flow-task.md): use it to stop a run you
started that is still queued or executing.

Get the `flowRunId` from [Run Flow](run-flow.md) / [Run Flow Task](run-flow-task.md)
(`job.runFlowJobType.flowRunId`) or from [List Flow Runs](list-flow-runs.md).

:::warning This tool changes server state
Cancellation is **best-effort and asynchronous**, not an instant kill:

- The run may take several seconds to actually stop (the backend polls for cancellation periodically).
- If the run is already **writing to an output database**, that write may finish even after the run
  shows Cancelled, which can leave the target in a partially-updated state. Cancelling does **not**
  roll back writes.
- It does **not** alter the flow definition or its schedule — it stops one run.

Only registered when `FLOW_WRITE_TOOLS_ENABLED=true` (default off).
:::

## APIs called

- [Cancel Flow Run](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref_flow.htm#cancel_flow_run)

## Required Tableau API scopes

- `tableau:flow_runs:update`
- `tableau:mcp_site_settings:read`

The `tableau:flow_runs:update` scope was added in Tableau Cloud December 2025 / Server 2025.3.

## Requirements

- **Caller-role:** in addition to site/server administrators, you can cancel a flow run only if you
  **initiated the run** (or created its scheduled task) **and** have Run Flow permission on the flow.
- Fails if the run has **already completed** (nothing to cancel), or if a site administrator has
  **disabled flow-run cancellation** for the site.

## Required arguments

### `flowRunId`

The id of the flow run to cancel.

## Bounded context (fail-closed)

A flow run carries no project or tag and is addressed only by run id, so when the server is restricted
to an `INCLUDE_PROJECT_IDS` / `INCLUDE_TAGS` bounded context this tool **cannot** verify the run's flow
is in the allowed set and **refuses** (mirroring [Run Flow Task](run-flow-task.md)).

## Response

An object `{ mcp: { cancelStatus } }`. Report the cancel as _requested_, then confirm the final state
with [List Flow Runs](list-flow-runs.md) / [Get Flow](get-flow.md).
