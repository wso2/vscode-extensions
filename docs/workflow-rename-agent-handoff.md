# Workflow Rename Handoff (Agent Context)

## Purpose
This document captures the workflow rename migration done across FE packages, how data flows end-to-end, what was removed, and where to check first when something breaks.

Scope of this pass:
- Canonical workflow node/API names are now:
  - `WORKFLOW_RUN`
  - `SEND_DATA`
  - `WAIT_DATA`
  - `workflowManager/getAllData`
- Legacy aliases were removed from FE code:
  - `WORKFLOW_START`
  - `SEND_EVENT`
  - `WAIT_EVENT`
  - `workflowManager/getAllEvents`
- `WORKFLOW_INPUT_TYPE` FE special handling was removed.

## Samples Used for Migration Context
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/samples/workflow/new-flow-model.json`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/samples/workflow/new-get-available-nodes-1.json`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/samples/workflow/new-get-available-nodes-2.json`

Important note:
- Some backend/API payloads may still expose legacy `WORKFLOW_START`.
- FE is now strictly on `WORKFLOW_RUN`; a code note exists in:
  - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`

## End-to-End Call Chain

### Workflow data lookup (`getAllData`)
1. Visualizer form:
   - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/views/BI/Forms/SendEventForm/index.tsx`
2. Webview RPC client:
   - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-rpc-client/src/rpc-clients/bi-diagram/rpc-client.ts`
3. RPC types:
   - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-core/src/rpc-types/bi-diagram/rpc-type.ts`
4. Extension RPC handler + manager:
   - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-extension/src/rpc-managers/bi-diagram/rpc-handler.ts`
   - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-extension/src/rpc-managers/bi-diagram/rpc-manager.ts`
5. Extended lang client:
   - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-extension/src/core/extended-language-client.ts`

### Workflow search (`WORKFLOW_RUN`)
1. Visualizer node list/workflow list search:
   - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`
2. Shared search-kind contract:
   - `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-core/src/interfaces/extended-lang-client.ts`

## Node Rename Map (bi-diagram)

Renamed folders/classes:
- `WorkflowStartNode` -> `WorkflowRunNode`
- `SendEventNode` -> `SendDataNode`
- `WaitEventNode` -> `WaitDataNode`

Renamed constants:
- `WORKFLOW_START_NODE` -> `WORKFLOW_RUN_NODE`
- `SEND_EVENT_NODE` -> `SEND_DATA_NODE`
- `WAIT_EVENT_NODE` -> `WAIT_DATA_NODE`
- `WAIT_EVENT_*` -> `WAIT_DATA_*`

Primary files:
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/bi-diagram/src/resources/constants.ts`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/bi-diagram/src/utils/diagram.ts`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/bi-diagram/src/utils/types.ts`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/bi-diagram/src/visitors/NodeFactoryVisitor.ts`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/bi-diagram/src/visitors/SizingVisitor.ts`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/bi-diagram/src/components/NodeIcon/index.tsx`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/bi-diagram/src/components/nodes/BaseNode/BaseNodeWidget.tsx`

## Visitor Dispatch Clue (High Signal)
Traversal uses dynamic method naming from `codedata.node`:
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-core/src/flow-model/flow-model-utils.ts`

Meaning:
- `codedata.node = WORKFLOW_RUN` -> visitor method `beginVisitWorkflowRun/endVisitWorkflowRun`
- `codedata.node = SEND_DATA` -> `beginVisitSendData/endVisitSendData`
- `codedata.node = WAIT_DATA` -> `beginVisitWaitData/endVisitWaitData`

If a method is missing, traversal falls back to generic `beginVisitNode/endVisitNode`, which is usually not what workflow-specific nodes need.

## Workflow Data Parsing in SendData Form
Current accepted response keys (in order):
1. `data`
2. `output.data`
3. `result.data`
4. `result.output.data`

Implementation:
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/views/BI/Forms/SendEventForm/index.tsx`

## `WORKFLOW_INPUT_TYPE` Removal
Removed FE special behavior and contexts in:
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/constants.ts`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/views/BI/FunctionForm/index.tsx`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/views/BI/Forms/FormGenerator/index.tsx`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-visualizer/src/views/BI/Forms/FormGeneratorNew/index.tsx`
- `/Users/gayanka/dev/wso2/vscode-extensions/main.worktrees/task-2/workspaces/ballerina/ballerina-side-panel/src/components/editors/EditorFactory.tsx`

## Validation Commands
Commands used to verify this migration:
- `npm run build` in `workspaces/ballerina/ballerina-core`
- `npm run build` in `workspaces/ballerina/ballerina-rpc-client`
- `npm run build` in `workspaces/ballerina/ballerina-side-panel`
- `npm run build` in `workspaces/ballerina/bi-diagram`
- `npm run test -- --watchman=false` in `workspaces/ballerina/bi-diagram`
- `npm run build` in `workspaces/ballerina/ballerina-visualizer`
- `npm run test-compile` in `workspaces/ballerina/ballerina-extension`

## Quick Debug Playbook

### Symptom: workflow search list is empty
Check:
1. Search request uses `searchKind: WORKFLOW_RUN` in:
   - `.../ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`
2. LS response category shape in logs.
3. Whether backend still expects/returns `WORKFLOW_START` (known migration lag risk).

### Symptom: workflow nodes render as generic nodes
Check:
1. `codedata.node` values in flow model payload.
2. Visitor methods exist for those values in:
   - `.../bi-diagram/src/visitors/NodeFactoryVisitor.ts`
   - `.../bi-diagram/src/visitors/SizingVisitor.ts`

### Symptom: send-data form has no data options
Check:
1. `getAllData` request path in extension and LS.
2. Response contains one of:
   - `data`, `output.data`, `result.data`, `result.output.data`

## Useful Grep
- Find any reintroduced legacy names:
```bash
rg -n "WORKFLOW_START|SEND_EVENT|WAIT_EVENT|getAllEvents|WorkflowEvents(Request|Response|Event)" workspaces/ballerina --glob '!**/AGENTS.md'
```

