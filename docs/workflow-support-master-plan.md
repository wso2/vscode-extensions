# Workflow Support Master Plan

## Goal
Add first-class **Workflow** artifact creation in BI artifact view and route users directly into the workflow diagram flow.

## Implemented in this task
- Added core type support for workflow artifacts and nodes:
  - `WORKFLOW` and `WORKFLOW_START` node kinds.
  - `WORKFLOW_INPUT_TYPE` form field input type.
  - `DIRECTORY_MAP.WORKFLOW` and `MACHINE_VIEW.BIWorkflowForm`.
  - `ARTIFACT_TYPE.Workflows` in extended language-client artifact interfaces.
- Added **Workflow** card in artifact view (`OtherArtifactsPanel`) and hooked it to open `BIWorkflowForm`.
- Reused `FunctionForm` as workflow form mode:
  - Uses `getNodeTemplate` with `node: WORKFLOW`.
  - Uses `getSourceCode` for save and navigation.
  - Workflow-specific title/subtitle and popup close artifact type.
- Implemented editor handling for `WORKFLOW_INPUT_TYPE`:
  - Side panel editor factory now routes it through type editor flow.
  - Workflow form marks `inputType` field as editable + context type-supported.
  - Guided type creation opens `EntryPointTypeCreator` for workflow input field.
  - Workflow save now resolves and injects `inputType.types[].typeModel` using `typesManager/getType` (with search fallback) before `getSourceCode`.
- Updated extension artifact mapping:
  - Workflow node updates publish artifact notifications with `artifactType: WORKFLOW`.
  - Project artifact traversal maps workflow artifacts into function bucket safely.
  - Added dedupe for function artifacts by id to avoid duplicates.
  - State-machine artifact-to-view mapping now treats workflow like function for diagram navigation.

## Follow-up tasks
1. Verify backend artifact category behavior in LS:
- Confirm whether workflow artifacts arrive under `Functions` or `Workflows` consistently.
- Remove fallback mapping once LS contract is finalized.

2. Improve workflow artifact organization in project explorer:
- Decide whether workflows should remain under Functions or have a dedicated explorer section.
- If dedicated: extend `ProjectDirectoryMap`, component-diagram grouping, and labels/icons.

3. Workflow-specific UX polish:
- Introduce dedicated icon for workflow card/artifact entries.
- Add field-level hints/validation specific to workflow input semantics.

4. Expand workflow node coverage:
- Add creator/edit flows for related nodes (for example `WORKFLOW_START`) from BI diagram/side panels.
- Ensure jump-to-diagram behavior is consistent for create/update.

5. Tests
- Add/extend e2e scenarios:
  - Create workflow from artifacts page.
  - Select/create workflow input type via type selector.
  - Save and verify navigation + artifact updates.

## Risks / assumptions
- Current implementation assumes workflow creation writes artifacts through existing flow design APIs (`getNodeTemplate` + `getSourceCode`) and that artifact updates are published through the same notification pipeline.
- Workflow input type creation currently uses `EntryPointTypeCreator` for guided mode; advanced mode still relies on standard type helper behavior.

## Latest implementation update (handoff)
- Clarified node intent:
  - `WORKFLOW`: workflow template creation flow (function definition style).
  - `WORKFLOW_START`: workflow initialization flow (function call style). Not implemented in artifact create flow yet.
- Fixed workflow create payload issue where generated source had `input` without type:
  - Added submit-time enrichment in `FunctionForm` for `WORKFLOW`:
    - Reads selected/created input type name from `properties.inputType.value`.
    - Resolves full type model via `typesManager/getTypes` + `typesManager/getType`.
    - Added fallback lookup via `flowDesignService/search` (`searchKind: TYPE`) + `typesManager/getType` for cross-file/imported cases.
    - Injects resolved model into `properties.inputType.types[0].typeModel` before calling `flowDesignService/getSourceCode`.
  - If lookup fails, preserves a minimal fallback `typeModel` object with the selected type name to avoid empty-type generation.
- Added popup-submit parity for workflow artifacts:
  - `FlowDiagram` parent popup submit handler now treats `DIRECTORY_MAP.WORKFLOW` similar to function/NP/data-mapper refresh behavior.
- Files updated for this fix:
  - `workspaces/ballerina/ballerina-visualizer/src/views/BI/FunctionForm/index.tsx`
  - `workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`

## Latest implementation update (workflow instance usage)
- Implemented “Start Workflow” flow in the diagram node-adding experience (reusing call-function style navigation):
  - From available nodes, selecting `WORKFLOW_START` now opens a searchable workflow list via `flowDesignService/search` with `searchKind: WORKFLOW_START`.
  - Selecting an item from that workflow list now calls `flowDesignService/getNodeTemplate` with the selected codedata and opens the form.
  - Saving continues to use existing form submit path (`flowDesignService/getSourceCode`) without extra save logic changes.
- Added a dedicated side panel view for workflows:
  - `SidePanelView.WORKFLOW_LIST` with title “Workflows” and workflow-specific search.
  - Back navigation now correctly handles `WORKFLOW_LIST` and returns to node list.
- Added create-workflow action inside workflow list (matching call-function UX):
  - If no workflows are available, a large `Create Workflow` button is shown.
  - If workflows exist, a `+` create button is shown in the category header.
  - Create action uses `flowDesignService/getNodeTemplate` with `node: WORKFLOW` and opens the same form panel flow.
- Added `WORKFLOW_START` to client-side `SearchKind` type union.
- Files updated for this fix:
  - `workspaces/ballerina/ballerina-core/src/interfaces/extended-lang-client.ts`
  - `workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/PanelManager.tsx`
  - `workspaces/ballerina/ballerina-visualizer/src/views/BI/FlowDiagram/index.tsx`
  - `workspaces/ballerina/ballerina-side-panel/src/components/NodeList/categoryConfig.ts`
