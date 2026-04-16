# Building the CLI
From the arazzo-designer-cli directory:

cd workspaces\arazzo\arazzo-designer-cli

# Build the MCP server binary
go build -o arazzo-cli.exe ./cmd/

# Build the test runner binary
go build -o test_runner.exe ./test_runner/