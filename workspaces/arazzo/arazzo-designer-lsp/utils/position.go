package utils

import (
	"go.lsp.dev/protocol"
)

// NewRange creates a new LSP Range
func NewRange(startLine, startChar, endLine, endChar int) protocol.Range {
	return protocol.Range{
		Start: protocol.Position{
			Line:      uint32(startLine),
			Character: uint32(startChar),
		},
		End: protocol.Position{
			Line:      uint32(endLine),
			Character: uint32(endChar),
		},
	}
}

// NewPosition creates a new LSP Position
func NewPosition(line, char int) protocol.Position {
	return protocol.Position{
		Line:      uint32(line),
		Character: uint32(char),
	}
}

// LineToRange converts a line number to a Range covering the entire line
func LineToRange(line int) protocol.Range {
	return NewRange(line, 0, line, 0)
}
