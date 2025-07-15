# Change log

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
