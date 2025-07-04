# MI Copilot Context

The `MICopilotContext` is a React context that provides state management and utility functions for the MI Copilot feature. It is designed to handle communication between the frontend and backend, manage user interactions, and maintain the state of the application.

## Key Features

1. **Backend Communication**:

    - Manages the connection to the backend using `rpcClient`.
    - Fetches project-specific details such as backend URI, runtime version, and UUID.

2. **State Management**:

    - Maintains various states such as messages, questions, conversations, file uploads, and token information.
    - Handles file history and user prompts.

3. **Event Handling**:

    - Supports events like chat clearing and backend request triggers.
    - Automatically updates local storage when state changes.

4. **Token Management**:

    - Tracks token usage and provides information about remaining tokens and reset time.

5. **Local Storage Integration**:
    - Saves and retrieves chat history, questions, code blocks, and file history from local storage.

## Context Structure

The `MICopilotContext` provides the following properties and methods:

### Project Details

-   `projectRuntimeVersion`: The runtime version of the project.
-   `isRuntimeVersionThresholdReached`: Boolean indicating if the runtime version meets the required threshold.(by default MI-4.4.0)
-   `projectUUID`: Unique identifier for the project.

### Backend Information

-   `rpcClient`: The RPC client for backend communication.
-   `backendUri`: The URI of the backend.

### UI State

-   `messages`: Array of chat messages for UI rendering.
-   `setMessages`: Function to update messages.
-   `questions`: Array of user questions.
-   `conversations`: Array of non-question messages.

### Backend State

-   `copilotChat`: Array of chat entries for backend communication.
-   `setCopilotChat`: Function to update `copilotChat`.
-   `codeBlocks`: Array of code blocks.
-   `setCodeBlocks`: Function to update `codeBlocks`.

### File and Image Management

-   `files`: Array of uploaded files.
-   `setFiles`: Function to update `files`.
-   `images`: Array of uploaded images.
-   `setImages`: Function to update `images`.

### File History

-   `FileHistory`: Array of file history entries.
-   `setFileHistory`: Function to update `FileHistory`.

### User Input

-   `currentUserPrompt`: Current user input prompt.
-   `setCurrentUserprompt`: Function to update `currentUserPrompt`.

### Event Handling

-   `isInitialPromptLoaded`: Boolean indicating if the initial prompt is loaded.
-   `setIsInitialPromptLoaded`: Function to update `isInitialPromptLoaded`.
-   `chatClearEventTriggered`: Boolean indicating if a chat clear event is triggered.
-   `setChatClearEventTriggered`: Function to update `chatClearEventTriggered`.
-   `backendRequestTriggered`: Boolean indicating if a backend request is triggered.
-   `setBackendRequestTriggered`: Function to update `backendRequestTriggered`.

### Token Information

-   `tokenInfo`: Object containing:
    -   `remainingPercentage`: Remaining token percentage.
    -   `isLessThanOne`: Boolean indicating if tokens are less than one.
    -   `timeToReset`: Time until tokens reset.
-   `setRemainingTokenPercentage`: Function to update the remaining token percentage.

### Utility Methods

-   `resetController`: Resets the `AbortController` for backend requests.

## Usage

To use the `MICopilotContext`, wrap your component tree with the `MICopilotContextProvider`:

```tsx
<MICopilotContextProvider>
    <YourComponent />
</MICopilotContextProvider>
```

Access the context using the custom hook:

```tsx
const context = useMICopilotContext();
```

This ensures that all components within the provider have access to the context's state and methods.
