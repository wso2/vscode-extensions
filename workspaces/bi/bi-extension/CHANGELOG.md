# Change log

## **1.2.1** (2025-08-13)

### Fixed

-   Resolved issues affecting Inline Data Mapper functionality and flow diagram rendering


## **1.2.0** (2025-07-29)

### Major Updates

-   **Enhanced Inline Data Mapper:** Redesigned for improved user experience with AI-driven mapping suggestions and a sub-mapping form.
-   **AI Copilot & RAG Workflows:** Upgraded AI Copilot now uses ballerina/ai packages, with low-code support added for advanced RAG workflows.

### Added

-   **AI Capabilities:**
    -   Support for Anthropic's Claude Sonnet v4 for code generation.
    -   Added Vector Knowledge Base node for RAG workflows.
    -   Configuration options for default AI model providers in the Flow Diagram.
-   **Editor & IDE Features:**
    -   New VSCode setting to manage the visibility of the Sequence Diagram.
    -   Option to include the current organization in search results.

### Changes

-   **Data Mapper:** Improved search, label positioning, and performance. Now refreshes automatically when code changes.
-   **AI & Copilot:** Streamlined flows for user-friendliness and enhanced agent capabilities with new packages.
-   **UI/UX:** Refined diagram rendering and title components for a more responsive interface.

### Fixed

-   **Data Mapper:** Corrected rendering issues and various bugs in mapping generation and type resolution.
-   **AI & Copilot:** Resolved re-rendering bugs and authentication flow issues.
-   **Configuration:** Fixed issues with Config.toml management and fast-run command failures.
-   **IDE Stability:** Addressed UI freezing, improved state management, and enhanced project handling in multi-root workspaces.


## **1.1.0** (2025-07-14)

### Major Features

- **Bundled Language Server**: Ballerina Language Server is now bundled with the extension, eliminating separate installation requirements and improving startup performance
- **Configurable Editor v2**: Complete redesign of the configuration editor with enhanced UI/UX and improved functionality
- **Type Editor Revamp**: A redesign of the type editor to improve feature discoverability and deliver a better user experience

### Added

- Enhanced AI file upload support with additional file types for improved analysis capabilities
- Documentation display in Signature Help for a better developer experience during code completion
- Enhanced service resource creation with comprehensive validation system for base paths, resource action calls, reserved keywords, and new UX for creating HTTP responses

### Changed

- **Integration Management**: Refactored artifacts management and navigation
- **UI Components**: 
  - Type Diagram and GraphQL designer with improved visual presentation
- **Developer Experience**:
  - Enhanced renaming editor functionality
  - Enhanced Form and Input Editor with Markdown support
  - Updated imported types display as view-only nodes for clarity

### Fixed

- **Extension Stability**:
  - Resolved extension startup and activation issues for reliable performance
- **Data Mapping & Visualization**:
  - Fixed issues when working with complex data types from imported modules
  - Improved visualization of array types and nested data structures
  - Enhanced connection line display in design diagrams
- **Testing & Debugging**:
  - Fixed GraphQL testing functionality for seamless API testing
  - Improved service testing support across different Ballerina versions
  - Enhanced test explorer compatibility with legacy projects
- **Configuration Management**:
  - Resolved configuration file editing and creation issues
  - Fixed form rendering problems that could cause UI freezing
- **Cross-Platform Support**:
  - Enhanced Windows compatibility for Java development kit integration
  - Improved file path handling across different operating systems
- **User Interface**:
  - Fixed theme-related display issues in command interfaces


## **1.0.3** (2024-05-28)

### Fixes

- Resolved issues with TryIt functionality for service paths containing special characters.
- Enhanced Data Mapper usability and visual presentation.
- Updated the record editor to correctly use `packageName`.
- Addressed display issues in type diagrams and improved service configuration options.


## **1.0.2** (2024-05-18)

### Added

- Integrated AI Chat onboarding experience with guided tutorials for new users
- Enhanced Flow Diagram with new node types including Lock node support and experimental Match node functionality

### Changed

- Streamlined AI Chat experience with improved authentication flow and command organization
- Optimized project handling for multi-root workspace environments
- Refreshed visual elements with theme-consistent node iconography

### Fixed

- Improved reliability of AI-assisted features with enhanced error handling
- Resolved several Data Mapper issues related to complex type handling and navigation
- Fixed test execution functionality in the test explorer


## **1.0.0**

- Initial release
