# File History Handling Behavior

This document explains the behavior of file history handling in the `CodeSegment` component, detailing how files are tracked and managed in various states.

---

## 1. Initial State
- **File Not in History**:  
  If the file (`name`) is not found in the `FileHistory` array, it is treated as a new file.  
  - **Behavior**:  
    - A new entry is added to `FileHistory` with:
      - `filepath`: The file's name.
      - `content`: The original content of the file (or `"notExists"` if the file does not exist).
      - `timestamp`: The current timestamp.
      - `currentAddedfFromChatIndex`: The index of the code segment being added.
      - `maxAddedFromChatIndex`: Initially the same as `currentAddedfFromChatIndex`.

---

## 2. Adding a File to the Workspace
- **File Already in History**:  
  If the file exists in `FileHistory`, it indicates prior addition or update.  
  - **Behavior**:  
    - Update `currentAddedfFromChatIndex` and `maxAddedFromChatIndex` to the current code segment index.
    - Update `content` with the file's original content (if it exists).

- **File Not in History**:  
  Treated as a new file (see **Initial State**).

---

## 3. Reverting a File to the Last Checkpoint
- **File Found in History**:  
  Reverts the file to its last checkpoint.  
  - **Behavior**:  
    - If `content` is not `"notExists"`, revert the file to the stored content.
    - If `content` is `"notExists"`, delete the file from the workspace.
    - Reset `currentAddedfFromChatIndex` to `-1` (indicating no association with the current code segment).
    - Update `maxAddedFromChatIndex` to the current index.

- **File Not Found in History**:  
  No action is taken, and an error is logged.

---

## 4. Checking Revertability
A file is **revertable** if:
- `currentAddedfFromChatIndex` is not `-1` (indicating it was added or updated via MI Copilot).
- `currentAddedfFromChatIndex` matches the current code segment index.

---

## 5. File Operations
- **Fetching File Info**:  
  The `fetchFileInfo` function retrieves the file path and artifact type using the `identifyArtifactTypeAndPath` utility.

- **Reading File Content**:  
  File content is fetched via `rpcClient` and stored in the `content` property of `FileHistory`.

- **Writing or Deleting Files**:  
  - On revert, write the file with `FileHistory` content or delete it if `content` is `"notExists"`.
  - Refresh the project explorer and open the project overview after reverting.

---

## 6. Updating FileHistory
- **When Adding a File**:  
  - Update the entry if the file exists in `FileHistory`.
  - Create a new entry if the file does not exist.

- **When Reverting a File**:  
  - Reset `currentAddedfFromChatIndex` to `-1`.
  - Update `maxAddedFromChatIndex` to the current index.

---

## Summary of Key Properties in `FileHistory`
- **`filepath`**: The file's name.
- **`content`**: The original content of the file (or `"notExists"` if the file does not exist).
- **`timestamp`**: The time the file was added to `FileHistory`.
- **`currentAddedfFromChatIndex`**: The index of the code segment that last added or updated the file.
- **`maxAddedFromChatIndex`**: The highest index of any code segment that added or updated the file.

This behavior ensures that file changes are tracked, revertable, and manageable within the MI Copilot interface.
