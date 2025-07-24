# Ballerina WS language server

This project is a server that runs the Ballerina language server via WebSocket and provides a file system interface for a web-based editor. It allows for remote file operations and supports interaction with Ballerina language features.

## Features

1. [Run the Ballerina language server via WebSocket](./src/bal_ls/index.ts).
2. [Expose a REST API for performing file system operations](./src/file_system/fsRoutes.ts).

## API Endpoints

### Language Server WebSocket

Endpoint: `ws://localhost:9091/bal`

Connect to the Ballerina language server via WebSocket.

### File System Routes

1. GET `http://localhost:9091/fs/clone/:userId/:repoName` - Clone a GitHub repository.

2. GET `http://localhost:9091/fs/stat?scheme=:scheme&url=:path` - Check if a file or directory exists and retrieve its metadata.

3. GET `http://localhost:9091/fs/read?scheme=:scheme&url=:path` - Read the contents of a directory or file.

4. POST `http://localhost:9091/fs/write?url=:path` - Write content to a specified file.

5. POST `http://localhost:9091/fs/mdir?url=:path` - Create a directory at the specified path.

6. POST `http://localhost:9091/fs/rename?oldUrl=:oldPath&newUrl=:newPath` - Rename a file or directory.

7. POST `http://localhost:9091/fs/copy` - Copy a file or directory to a new location.

8. DELETE `http://localhost:9091/fs/remove?url=:path` - Remove a specified file or directory.

## Project structure

```bash
src/
├── bal_ls/               # Ballerina language server integration
├── file_system/          # File system operations and routing
├── index.ts              # Entry point for the server
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-repo.git
cd your-repo
```

2. Install dependencies:

```bash
npm install
```

3. Run the server:

```bash
npm start
```

The server will start on port `9091` by default.
