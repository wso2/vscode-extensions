# Change Log

All notable changes to the "micro-integrator" extension will be documented in this file.

## [3.1.3] - 2026-02-05

### Fixed

Fixed: Minor issues in the project migration flow

## [3.1.2] - 2026-01-22

### Fixed

Fixed: Invalid Synapse Expressions ([#1374](https://github.com/wso2/mi-vscode/issues/1374))  
Fixed: Data service Synapse configuration gets corrupted ([#1377](https://github.com/wso2/mi-vscode/issues/1377))  
Fixed: Artifact ID of the project changes while migrating the project  ([#1378](https://github.com/wso2/mi-vscode/issues/1378))  

## [3.1.1] - 2025-12-12

### Fixed

Fixed: Diagram issue when using Filter and If-Else mediators ([#1356](https://github.com/wso2/mi-vscode/issues/1356))  
Fixed: Ballerina Executable Not Found Error ([#1357](https://github.com/wso2/mi-vscode/issues/1357))  
Fixed: Cannot edit a proxy in Windows OS ([#1368](https://github.com/wso2/mi-vscode/issues/1368))  
Fixed: Issues in the build and run functionality ([#1369](https://github.com/wso2/mi-vscode/issues/1369))  

## [3.1.0] - 2025-12-08

### New Features

Added: Nested query support for data services via a separate query view  
Added: Oracle synonym support for data service resource generation  

### Fixed

Fixed: .env file should be added to the gitignore by default ([#668](https://github.com/wso2/mi-vscode/issues/668))  
Fixed: Show a message when the CApp generation is successful ([#1289](https://github.com/wso2/mi-vscode/issues/1289))  
Fixed: Add parameter doesn't add parameter values to the xml in cdc inbound endpoint ([#1204](https://github.com/wso2/mi-vscode/issues/1204))  
Fixed: No error shown we retry connectors without internet connection ([#1314](https://github.com/wso2/mi-vscode/issues/1314))  
Fixed: Variables are not shown in the mediation debugger ([#1308](https://github.com/wso2/mi-vscode/issues/1308))  
Fixed: UI alignment issue in mock services ([#1042](https://github.com/wso2/mi-vscode/issues/1042))  
Fixed: Improve Marketplace Page for Micro Integrator Extension ([#1022](https://github.com/wso2/mi-vscode/issues/1022))  
Fixed: Issues in HTTP Endpoint Template create form ([#970](https://github.com/wso2/mi-vscode/issues/970))  
Fixed: Adding new connector version without validation breaks pom.xml ([#1259](https://github.com/wso2/mi-vscode/issues/1259))  
Fixed: Runtime services panel shows the versioned APIs when versioning is disabled ([#1343](https://github.com/wso2/mi-vscode/issues/1343))  
Fixed: Build CApp option ask about deployment.toml configs ([#1306](https://github.com/wso2/mi-vscode/issues/1306))  
Fixed: Remove Server Type in remote deployment settings page ([#1295](https://github.com/wso2/mi-vscode/issues/1295))  
Fixed: The groupId, artifactId of a project is not visible in the Project summary ([#1293](https://github.com/wso2/mi-vscode/issues/1293))  
Fixed: Error When Searching Mediators Offline ([#1098](https://github.com/wso2/mi-vscode/issues/1098))  
Fixed: "Maximum redelivery attempts" field in Message Forwarding Processors does not allow -1 as a value ([#695](https://github.com/wso2/mi-vscode/issues/695))  
Fixed: Dataservice resource diagram start node has the option to set a payload for tryout ([#715](https://github.com/wso2/mi-vscode/issues/715))  
Fixed: Can add TryOut payload to start node in 4.3.0 projects ([#1347](https://github.com/wso2/mi-vscode/issues/643))  
Fixed: Text editor does not provide synapse suggestions ([#643](https://github.com/wso2/mi-vscode/issues/1347))  
Fixed: Cannot delete a datamapper in Windows OS ([#1361](https://github.com/wso2/mi-vscode/issues/1361))  
Fixed: User given OpenAPI definition is not exposed by the MI server ([#1362](https://github.com/wso2/mi-vscode/issues/1362))  
Fixed: API update option not appearing after OpenAPI definition update ([#1363](https://github.com/wso2/mi-vscode/issues/1363))   

## [3.0.1] - 2025-11-21

### Fixed

Fixed: Error when opening a diagram view on a new tab ([#1346](https://github.com/wso2/mi-vscode/issues/1346))   
Fixed: Cannot add email connector operations after adding a foreach mediator ([#1348](https://github.com/wso2/mi-vscode/issues/1348))  
Fixed: Path level parameters are not getting recognized in OpenAPI definition ([#1353](https://github.com/wso2/mi-vscode/issues/1353))   
Fixed: Unit test execution command ignores the test.server.path argument ([#1354](https://github.com/wso2/mi-vscode/issues/1354))  

## [3.0.0] - 2025-11-03

### Improvements

- Multi-project Support
- Versioned Artifact Support
- Dependency Management for Integration Projects
- Newly introduced Intelligent Document Processing connector
- Improved Unit Testing UI
- Kubernetes Configuration Support
- Improvements to Connectors and Listeners
- Enhancements to the MI Copilot
  - Syntax validation of generated code
  - “Thinking mode” that suggests improvements
  - Migration support for old data mapper content
  - Feedback and rating support for generated AI outputs

## [2.4.1] - 2025-07-09

### Fixed

Fixed: WS-Policy UI options are not available in the MI extension ([#1164](https://github.com/wso2/mi-vscode/issues/1164))   
Fixed: Artifact name validation issue ([#1165](https://github.com/wso2/mi-vscode/issues/1165))  

## [2.4.0] - 2025-07-02

### New Features

Added: Support for Resources, Data Mappers and Connections in Unit Test Framework ([#1147](https://github.com/wso2/mi-vscode/issues/1147))   

## [2.3.3] - 2025-06-27

### Fixed

Fixed: Artifacts in the registry appearing multiple times in the project explorer ([#802](https://github.com/wso2/mi-vscode/issues/802))   
Fixed: Handling nested artifact structure during migration ([#1154](https://github.com/wso2/mi-vscode/issues/1154))  
Fixed: Handling artifacts with OS-specific paths in artifact.xml ([#1155](https://github.com/wso2/mi-vscode/issues/1155))   
Fixed: Issue with incorrect collection path in artifact.xml after migration ([#1157](https://github.com/wso2/mi-vscode/issues/1157))  
Fixed: Issue in migrating directories within a collection ([#1158](https://github.com/wso2/mi-vscode/issues/1158))  

## [2.3.2] - 2025-06-24

### Fixed

Fixed: Error migrating multi-module projects containing expressions in pom.xml ([#1152](https://github.com/wso2/mi-vscode/issues/1152))     
Fixed: Error migrating nested composite exporters in multi-module projects ([#1153](https://github.com/wso2/mi-vscode/issues/1153))

## [2.3.1] - 2025-06-20

### Fixed

Fixed: Error building project with maven wrapper ([#1078](https://github.com/wso2/mi-vscode/issues/1078))   
Fixed: Error extracting Java version with JAVA_TOOL_OPTIONS ([#1128](https://github.com/wso2/mi-vscode/issues/1128))   
Fixed: Issue with checkbox value rendering in MI VSCode ([#1140](https://github.com/wso2/mi-vscode/issues/1140))   
Fixed: "Generate from Datasource" option requires selection from all tables ([#1145](https://github.com/wso2/mi-vscode/issues/1145))   
Fixed: Mandate the legacy expression editor for MI 4.3.0 and below runtime versions ([#1150](https://github.com/wso2/mi-vscode/issues/1150))

## [2.3.0] - 2025-06-13

### New Features

Added: Improvements to the multi-module project migration process ([#1139](https://github.com/wso2/mi-vscode/issues/1139))

## [2.2.4] - 2025-06-06

### New Features

Added: Support to deploy CApps in a remote server ([#936](https://github.com/wso2/mi-vscode/issues/936))

### Fixed

Fixed: Issues in server execution ([#1129](https://github.com/wso2/mi-vscode/issues/1129))   
Fixed: Minor issues in data service resource generation and file event-integration creation form fields

## [2.2.3] - 2025-05-30

### Fixed

Fixed: Check whether Ballerina is installed globally ([#1114](https://github.com/wso2/mi-vscode/issues/1114))   
Fixed: Issues in Project Migration ([#1115](https://github.com/wso2/mi-vscode/issues/1115))

## [2.2.2] - 2025-05-23

### New Features

Added: gRPC connector generation support ([#990](https://github.com/wso2/mi-vscode/issues/990))  
Added: Improvements to the AI connector

## [2.2.1] - 2025-05-16

### New Features

Added: Support Custom Inbound-Connectors ([#1049](https://github.com/wso2/mi-vscode/issues/1049))  
Added: Improve Ballerina Module build process ([#1075](https://github.com/wso2/mi-vscode/issues/1075))  
Added: Improvements to the AI connector

### Fixed

Fixed: Issue with opening projects created with the older version of Integration Studio ([#1031](https://github.com/wso2/mi-vscode/issues/1031))  
Fixed: Cannot edit Sequence Templates ([#1047](https://github.com/wso2/mi-vscode/issues/1047))  
Fixed: Docker image build doesn't allow project names with uppercase letters ([#1055](https://github.com/wso2/mi-vscode/issues/1055))  
Fixed: Runtime services panel always call the default port ([#1076](https://github.com/wso2/mi-vscode/issues/1076))  
Fixed: Cannot add a policy via the Advanced Configurations in the Edit Proxy form ([#1091](https://github.com/wso2/mi-vscode/issues/1091))  
Fixed: ID attribute is not getting updated in the Cache mediator ([#1092](https://github.com/wso2/mi-vscode/issues/1092))  
Fixed: Swagger file not getting generated when importing APIs ([#1097](https://github.com/wso2/mi-vscode/issues/1097))

## [2.2.0] - 2025-04-26

### New Features

Added: Add option to download the diagram as a image  
Added: Add support to update MI Server ([#1056](https://github.com/wso2/mi-vscode/issues/1056))

### Fixed

Fixed: Table type values not parsing into Synapse XML in MI Inbound Endpoint form ([#1054](https://github.com/wso2/mi-vscode/issues/1054))  
Fixed: Update connector form submit buttons for consistency ([#1048](https://github.com/wso2/mi-vscode/issues/1048))
Fixed: Show all available modules in listing

## [2.1.5] - 2025-04-11

### Improvements

- UI Improvements to the MI Copilot for Enhanced User Experience

## [2.1.4] - 2025-04-04

### Fixed

Fixed: Dependency Deletion Issue When Updating Version of Dependency ([#981](https://github.com/wso2/mi-vscode/issues/981))  
Fixed: Support Start Node Payload Configuration for Each Resource ([#982](https://github.com/wso2/mi-vscode/issues/982))  
### Improvements

Improved: Add option to provide path params and query params in `TryOut` ([#653](https://github.com/wso2/mi-vscode/issues/653))  
Improved: Enhance Tryout Feature with Broader Content Type Support ([#827](https://github.com/wso2/mi-vscode/issues/827))  

## [2.1.3] - 2025-03-27

### Fixed

Fixed: VSCode fails to load artifacts without the default switch case ([#973](https://github.com/wso2/mi-vscode/issues/973))  
### Improvements

Improved: Improve picking datatypes for custom function parameters and return type ([#914](https://github.com/wso2/mi-vscode/issues/914))
Improved: Table type values not parsing into Synapse XML in MI connector init form ([#969](https://github.com/wso2/mi-vscode/issues/969))  

## [2.1.2] - 2025-03-17

### Fixed

Fixed: Connection icons in AI connector

## [2.1.1] - 2025-03-17

### Fixed

Fixed: Unable to Create RabbitMQ Inbound Endpoint in WSO2 MI – 'Create Event Integration' Window Fails to Open ([#959](https://github.com/wso2/mi-vscode/issues/959))

## [2.1.0] - 2025-03-15

### New Features

Added: Support for Creating AI Agents ([#956](https://github.com/wso2/mi-vscode/issues/956))

### Fixed

Fixed: Clicking on the "Open Graphical VIew" from the source view of an API resource does not open the graphical view ([#794](https://github.com/wso2/mi-vscode/issues/794))  

### Improvements

Improved: Devant integration UX

## [2.0.4] - 2025-03-10

### Fixed

Fixed: Artifact creation in windows ([#943](https://github.com/wso2/mi-vscode/issues/943))


## [2.0.3] - 2025-03-09

### New Features

Added: Devant support ([#290](https://github.com/wso2/devant/issues/290))  
Added: Ballerina modules generation support ([#942](https://github.com/wso2/mi-vscode/issues/942))

### Fixed

Fixed: After creating proxy, wrong redirection ([#635](https://github.com/wso2/mi-vscode/issues/635))  
Fixed: Resource Path gets overwritten by default values in "Create New Resource" form ([#788](https://github.com/wso2/mi-vscode/issues/788))  
Fixed: Can create a new project with existing project name ([#839](https://github.com/wso2/mi-vscode/issues/839))  
Fixed: When creating an API with openAPI definition without the swagger file the `create` button is enabled. ([#908](https://github.com/wso2/mi-vscode/issues/908))  


## [2.0.2] - 2025-03-03

### Fixed

Fixed: Editing Task Properties Adds Invalid @_xmlns Attribute to XML in the VSCode Extension ([#512](https://github.com/wso2/mi-vscode/issues/512))  
Fixed: Can add duplicate config values ([#682](https://github.com/wso2/mi-vscode/issues/682))  
Fixed: Adding connector operations in a switch case make the connector icon in left case hidden from the right one. ([#692](https://github.com/wso2/mi-vscode/issues/692))  
Fixed: Cancel button in some template forms not working. ([#808](https://github.com/wso2/mi-vscode/issues/808))  
Fixed: Syntax issue in Scheduled Task xml after adding a new property ([#844](https://github.com/wso2/mi-vscode/issues/844))  
Fixed: Required `Template` field is not indicated in template endpoint ([#858](https://github.com/wso2/mi-vscode/issues/858))  
Fixed: Generating incorrect code when updating the task ([#899](https://github.com/wso2/mi-vscode/issues/899))  
Fixed: Debezium CDC Connector form doesn't work properly ([#915](https://github.com/wso2/mi-vscode/issues/915))  
Fixed: State changing issue in the checkbox component ([#919](https://github.com/wso2/mi-vscode/issues/919))  
Fixed: Copy pasting values for Inline Expression editors gets ignored. ([#922](https://github.com/wso2/mi-vscode/issues/922))  

## [2.0.1] - 2025-02-25

### Improvements
- Add support to download older connector versions
- Add support to mark the automation sequence from project explorer view
- Add minor UI improvements

## [2.0.0] - 2025-02-20

### Improvements

- New mediators
  - Scatter-Gather: Clones a message into several and aggregates the responses into a single message. Supports parallel or sequential execution, with output to a variable or message body
  - Foreach v2: Supports parallel or sequential iteration and allows updating the original array or outputting results to a variable
  - ThrowError: Enables throwing an error from the mediation flow
- Enhanced mediator functionality
  - Inline expression support for PayloadFactory Mediator and Log Mediator
  - UI Enhancements for the commonly used mediators
- Mediator tryout functionality
- Simplified onboarding experience
- Synapse expression support: A new simplified expression type offering advanced message manipulation and greater flexibility
- Environment variable injection for all environment-specific parameters
- JDK 21 support
- Dependency management for connectors
- Newly introduced HTTP connector
- Improvements to the data mapper
- Framework for building GenAI applications


## [1.1.6] - 2024-11-26

### Improvements

Improved: Improve array mapping experience in Data Mapper ([#527](https://github.com/wso2/mi-vscode/issues/527), [#527](https://github.com/wso2/mi-vscode/issues/528))  
Improved: Improve Data Mapper expression bar completion experience ([#524](https://github.com/wso2/mi-vscode/issues/524), [#513](https://github.com/wso2/mi-vscode/issues/513))

### Fixed

Fixed: Issue in the Data Mapper ([#511](https://github.com/wso2/mi-vscode/issues/511))  


## [1.1.4] - 2024-11-06

### Fixed

Fixed: Issues in the Expression Editor of the Data Mapper component ([#477](https://github.com/wso2/mi-vscode/issues/477))  
Fixed: Resizing window or zooming in and out causes issues in the data mapper field mappings ([#478](https://github.com/wso2/mi-vscode/issues/478))  
Fixed: Issues in the Data Mapper component ([#479](https://github.com/wso2/mi-vscode/issues/479))  
Fixed: Issues in the Data Mapper component ([#479](https://github.com/wso2/mi-vscode/issues/479))  


## [1.1.3] - 2024-10-28

### Fixed

Fixed: Diagram not rendering when iterate mediator is added ([#440](https://github.com/wso2/mi-vscode/issues/440))  
Fixed: Diagram breaks after certain proxy edit operations ([#457](https://github.com/wso2/mi-vscode/issues/457))  
Fixed: Cannot execute a selected unit test ([#463](https://github.com/wso2/mi-vscode/issues/463))  
Fixed: Cannot update an API ([#466](https://github.com/wso2/mi-vscode/issues/466))  
Fixed: Source view option is missing in the data service artifact ([#467](https://github.com/wso2/mi-vscode/issues/467))  
Fixed: Delay in starting the extension ([#481](https://github.com/wso2/mi-vscode/issues/481))  
### Improvements

Improved: Improve the API resource creation form ([#394](https://github.com/wso2/mi-vscode/issues/394))  


## [1.1.2] - 2024-10-15

### Fixed

Fixed: Delete value option is not working in MI Datamapper submapings ([#404](https://github.com/wso2/mi-vscode/issues/404))  
Fixed: Unit test results are not formatted correctly in the console output ([#422](https://github.com/wso2/mi-vscode/issues/422))  
Fixed: Fix unit test issues ([#424](https://github.com/wso2/mi-vscode/issues/424))  
Fixed: Proxy diagram breaks when named insequence is added ([#436](https://github.com/wso2/mi-vscode/issues/436))  
Fixed: Issues in the Externals endpoint section ([#437](https://github.com/wso2/mi-vscode/issues/437))  
Fixed: Service catalog is not working properly for versioned API ([#447](https://github.com/wso2/mi-vscode/issues/447))  
Fixed: Edited values using expression bar in MI Datamapper not applying without internet ([#449](https://github.com/wso2/mi-vscode/issues/449))  
Fixed: Connections created for few connectors are not listed in externals tab ([#455](https://github.com/wso2/mi-vscode/issues/455))  
Fixed: Datamapper crashes when dynamically adding inputs to output in submapping ([#456](https://github.com/wso2/mi-vscode/issues/456))  
Fixed: Diagram breaks after certain proxy edit operations ([#457](https://github.com/wso2/mi-vscode/issues/457))  
Fixed: Datamapper crashes when opening ([#460](https://github.com/wso2/mi-vscode/issues/460))  
Fixed: Cannot execute a selected unit test ([#463](https://github.com/wso2/mi-vscode/issues/463))  
Fixed: Issues in unit tests ([#465](https://github.com/wso2/mi-vscode/issues/465))  
### Improvements

Improved: Placeholders for Name and Value fields in the Parameters section in Message Processor forms are not disabled ([#438](https://github.com/wso2/mi-vscode/issues/438))  


## [1.1.1] - 2024-10-01

### New Features
- Added: [DataMapper]Provide a way to make output data fields optional ([#382](https://github.com/wso2/mi-vscode/issues/382))
### Fixes

- Fixed: Not having empty "username" and "password" tags for RabbitMQ message store causes an error ([#51](https://github.com/wso2/mi-vscode/issues/51))  
- Fixed: Deprecated outSequence added when creating a proxy service through the VSCode plugin ([#73](https://github.com/wso2/mi-vscode/issues/73))  
- Fixed: Update form fields for adding new service parameters to display placeholders instead of values ([#130](https://github.com/wso2/mi-vscode/issues/130))  
- Fixed: Allows to create APIs with same Context ([#158](https://github.com/wso2/mi-vscode/issues/158))  
- Fixed: DSS Output mapping text box adds whitespaces before the text  ([#166](https://github.com/wso2/mi-vscode/issues/166))  
- Fixed: When we create a complex integration with multiple branches the diagram goes out of the working view ([#188](https://github.com/wso2/mi-vscode/issues/188))  
- Fixed: Try-it window dosn't remove old services upon new capp deployement  ([#195](https://github.com/wso2/mi-vscode/issues/195))  
- Fixed: After deleting API, it does not allow to add an API with same name ([#199](https://github.com/wso2/mi-vscode/issues/199))  
- Fixed: Co-pilot not working for APIs that have versioning ([#203](https://github.com/wso2/mi-vscode/issues/203))  
- Fixed: Properties of custom tasks cannot be set via the design view ([#271](https://github.com/wso2/mi-vscode/issues/271))  
- Fixed: Car app export path is forgotten ([#280](https://github.com/wso2/mi-vscode/issues/280))  
- Fixed: Compile time diagnostics in the generated synapse script when security is enabled for a proxy service ([#295](https://github.com/wso2/mi-vscode/issues/295))  
- Fixed: [Data Mapper Mediator] Adding a new schema over CSV (or schema with an array) leads to incorrect mapping ([#347](https://github.com/wso2/mi-vscode/issues/347))  
- Fixed: Parameter values are getting encoded in connection form ([#363](https://github.com/wso2/mi-vscode/issues/363))  
- Fixed: Connector operation edit form is not shown for operation names with a dot ([#364](https://github.com/wso2/mi-vscode/issues/364))  
- Fixed: Add support for configuring CSV separators in datamapper ([#373](https://github.com/wso2/mi-vscode/issues/373))  
- Fixed: Cannot build Docker Image in Windows OS ([#380](https://github.com/wso2/mi-vscode/issues/380))  
- Fixed: The cancel button in "Add New Connection" form is not working. ([#384](https://github.com/wso2/mi-vscode/issues/384))  
- Fixed: contentType attribute cannot be configured in file connector read operation ([#387](https://github.com/wso2/mi-vscode/issues/387))  
- Fixed: Endpoint popup form is missing close button ([#390](https://github.com/wso2/mi-vscode/issues/390))  
- Fixed: Non mandatory fields are marked as mandatory fields ([#392](https://github.com/wso2/mi-vscode/issues/392))  
- Fixed: Inconsistencies in the API creation form ([#393](https://github.com/wso2/mi-vscode/issues/393))  
- Fixed: Cannot create a new connection if the connectionName default value is missing in UI Schema ([#396](https://github.com/wso2/mi-vscode/issues/396))  
- Fixed: Issues in UI components  ([#400](https://github.com/wso2/mi-vscode/issues/400))  
- Fixed: "Create New Test Suite" does not work when project is in a WSL folder ([#401](https://github.com/wso2/mi-vscode/issues/401))  
- Fixed: Fails to build data mapper in Windows ([#403](https://github.com/wso2/mi-vscode/issues/403))  
- Fixed: Crashes when open a data mapper without internet connection in MI Extension ([#405](https://github.com/wso2/mi-vscode/issues/405))  
- Fixed: Renaming the connection name of a connection adds a new connection ([#406](https://github.com/wso2/mi-vscode/issues/406))  
- Fixed: Can add cases in switch mediator with empty value for case regex. ([#412](https://github.com/wso2/mi-vscode/issues/412))  
- Fixed: Unit test explorer not rendering when properties tag inside input is empty ([#414](https://github.com/wso2/mi-vscode/issues/414))  
- Fixed: Unit test generated supported-artifacts has a typo ([#415](https://github.com/wso2/mi-vscode/issues/415))  
- Fixed: Users can view source from creation forms ([#418](https://github.com/wso2/mi-vscode/issues/418))  
- Fixed: Back button in the extension does not work properly ([#420](https://github.com/wso2/mi-vscode/issues/420))  
### Improvements

- Improved: No option to resize DSS output mapping text box ([#165](https://github.com/wso2/mi-vscode/issues/165))  
- Improved: VSCode does not validate retry error codes provided when creating an endpoint ([#204](https://github.com/wso2/mi-vscode/issues/204))  
- Improved: Required fields for adding a WSDL resource to a proxy service are not being validated correctly. ([#278](https://github.com/wso2/mi-vscode/issues/278))  
- Improved: Export action always prompts for a location ([#308](https://github.com/wso2/mi-vscode/issues/308))  
- Improved: Misalignment in text and design view's `+` sign in `Switch` mediator. ([#310](https://github.com/wso2/mi-vscode/issues/310))  
- Improved: Introduce a placeholder instead of a default value for the added Parameters when creating a Sequence Template. ([#311](https://github.com/wso2/mi-vscode/issues/311))  
- Improved: Available endpoints should be listed under `Static` when adding endpoints for a `Load Balance Endpoint`. ([#327](https://github.com/wso2/mi-vscode/issues/327))  
- Improved: Improve UX by Stoping Auto-scrolling in Copilot Window when User Scrolls up ([#358](https://github.com/wso2/mi-vscode/issues/358))  
- Improved: [Data Mapper Mediator] Add ability to access specific array field elements in the Visualizer ([#389](https://github.com/wso2/mi-vscode/issues/389))  
- Improved: Add loader in connector store [connection creation flow] on fetching store connectors ([#391](https://github.com/wso2/mi-vscode/issues/391))  
- Improved: Improve Endpoint creation wizard ([#395](https://github.com/wso2/mi-vscode/issues/395))  

## [1.1.0] - 2024-09-06

### New Features

- Added: Add feature to import CAPP to vscode workspace ([#113](https://github.com/wso2/mi-vscode/issues/113))  
- Added: Implement AI Data Mapping for MI Extension Data Mapper Mediator ([#377](https://github.com/wso2/mi-vscode/issues/377))  
### Fixes

- Fixed: Getting Started Sample Icons are not rendered properly ([#119](https://github.com/wso2/mi-vscode/issues/119))  
- Fixed: In a nested switch case mediator we can't add mediators to the first case.  ([#196](https://github.com/wso2/mi-vscode/issues/196))  
- Fixed: Modifying the local entry, originally configured using a `source URL entry`, gets converted to an `inline XML entry`. ([#242](https://github.com/wso2/mi-vscode/issues/242))  
- Fixed: New mediator got added in wrong place in nested switch mediator ([#247](https://github.com/wso2/mi-vscode/issues/247))  
- Fixed: JMS API Version field in the Message store edit form doesn't retain value previously selected ([#276](https://github.com/wso2/mi-vscode/issues/276))  
- Fixed: Typo in WSDL Resources section in Edit Proxy form ([#277](https://github.com/wso2/mi-vscode/issues/277))  
- Fixed: The placeholders in the additional properties section in an endpoint creation form needs to be manually deleted ([#286](https://github.com/wso2/mi-vscode/issues/286))  
- Fixed: Possible to create a DB Report mediator with no statement  ([#302](https://github.com/wso2/mi-vscode/issues/302))
- Fixed: Scheduled message forwarding processor create form doesn't mandate the message store field ([#324](https://github.com/wso2/mi-vscode/issues/324))  
- Fixed: Deprecated Mediators available in Mediators pallet.  ([#337](https://github.com/wso2/mi-vscode/issues/337))  
- Fixed: Export option don't build the new CAR file ([#342](https://github.com/wso2/mi-vscode/issues/342))  
- Fixed: In the Validate mediator, the Schemas dropdown does not display available Local Entries. ([#346](https://github.com/wso2/mi-vscode/issues/346))  
- Fixed: Sequence edit form does not show onError sequences properly ([#348](https://github.com/wso2/mi-vscode/issues/348))  
- Fixed: MI Co-pilot is not recovering from Token errors ([#349](https://github.com/wso2/mi-vscode/issues/349))  
- Fixed: Error occurs when editing submapping in datamapper ([#350](https://github.com/wso2/mi-vscode/issues/350))  
- Fixed: Data Mapper UI is not resize on window resizing ([#351](https://github.com/wso2/mi-vscode/issues/351))  
- Fixed: Should not be possible to create a `Reception List Endpoint` without including any endpoints. ([#353](https://github.com/wso2/mi-vscode/issues/353))  
- Fixed: Cannot uncheck attribute linked as enableCondition in Inbound endpoints ([#354](https://github.com/wso2/mi-vscode/issues/354))  
- Fixed: Mix use of local and global scroll cause to unexpected behaviour ([#355](https://github.com/wso2/mi-vscode/issues/355))  
- Fixed: Global scrolling of the data mapper is not working when no submapping is present ([#356](https://github.com/wso2/mi-vscode/issues/356))  
- Fixed: MI Extension for VS Code Problem with Data Source creation ([#357](https://github.com/wso2/mi-vscode/issues/357))  
- Fixed: [DataMapper] Mapping conditions getting corrupted after initialising an array element  ([#359](https://github.com/wso2/mi-vscode/issues/359))  
- Fixed: Add Artifact has no Option for Data Service ([#360](https://github.com/wso2/mi-vscode/issues/360))  
- Fixed: Invalid XML error in proxy service when parameter is entered before target element ([#362](https://github.com/wso2/mi-vscode/issues/362))  
- Fixed: Migration tool fails when source project lacks expected folders ([#372](https://github.com/wso2/mi-vscode/issues/372))  
- Fixed: Message inject destination sequence is not updated correctly when creating a new scheduled task ([#376](https://github.com/wso2/mi-vscode/issues/376))  
### Improvements

- Improved: Sample projects always opening in a new window ([#94](https://github.com/wso2/mi-vscode/issues/94))  
- Improved: Project name cannot contain special characters ([#115](https://github.com/wso2/mi-vscode/issues/115))  
- Improved: resource created when creating an API has "/resource" as the uri-template ([#164](https://github.com/wso2/mi-vscode/issues/164))  
- Improved: Support for custom data types in submappings ([#323](https://github.com/wso2/mi-vscode/issues/323))  
- Improved: Project name creation - Project name cannot contain spaces or special characters   ([#330](https://github.com/wso2/mi-vscode/issues/330))  
- Improved: Added connection's source view is not formatted correctly ([#334](https://github.com/wso2/mi-vscode/issues/334))  
- Improved: Improve diagram reload when update ([#374](https://github.com/wso2/mi-vscode/issues/374))  

## [1.0.5] - 2024-08-20

### Fixes

- Fixed: Update artifact.xml file when the name is changed of an artifact in the registry ([#132](https://github.com/wso2/mi-vscode/issues/132))  
- Fixed: Change Input Schema window not opened in the Data Mapper for CSV ([#175](https://github.com/wso2/mi-vscode/issues/175))  
- Fixed: Connector operations don't show config key or connection name ([#186](https://github.com/wso2/mi-vscode/issues/186))  
- Fixed: Expression editor is not shown HTTP Endpoint Auth configs ([#200](https://github.com/wso2/mi-vscode/issues/200))  
- Fixed: Provider URL with tcp not accepted when creating JMS message store ([#263](https://github.com/wso2/mi-vscode/issues/263))  
- Fixed: Edit form for message stores doesn't work properly when there are invalid values in the synapse code ([#275](https://github.com/wso2/mi-vscode/issues/275))  
- Fixed: Fast XSLT mediator dropdown not displaying XSLT and XSL registry resources ([#297](https://github.com/wso2/mi-vscode/issues/297))  
- Fixed: Empty form generated when trying to add parameters to a sql statement in the DB Report mediator ([#301](https://github.com/wso2/mi-vscode/issues/301))  
- Fixed: DB Report mediator form fields `Connection DB Type` and  `Database Configuration` resets when trying to edit the form ([#303](https://github.com/wso2/mi-vscode/issues/303))  
- Fixed: Nodes disappears while filtering ([#304](https://github.com/wso2/mi-vscode/issues/304))
- Fixed: Fast clearing search term in FilterBox cause to broken links ([#312](https://github.com/wso2/mi-vscode/issues/312))  
- Fixed: You can add an `XSLT mediator` without specifying a schema key for the required `XSLT Schema Key field`. ([#314](https://github.com/wso2/mi-vscode/issues/314))  
- Fixed: For the `Inline` payload format, changing the `Media Type` does not update the placeholder in the payload field. ([#315](https://github.com/wso2/mi-vscode/issues/315))  
- Fixed: When adding arguments to a `Payload Factory` mediator, the `Evaluator` field is only needed if the value is an expression. ([#317](https://github.com/wso2/mi-vscode/issues/317))  
- Fixed: Adding wrong inline endpoint definition, doesn't allow to edit the `Call` mediator. ([#319](https://github.com/wso2/mi-vscode/issues/319))  
- Fixed: Adding an incorrect element for the inline definition of Call mediator cause unexpected behaviour.  ([#322](https://github.com/wso2/mi-vscode/issues/322))  
- Fixed: Creating a new Message Store form with ActiveMQ default values gives validation errors. ([#328](https://github.com/wso2/mi-vscode/issues/328))  
- Fixed: Clicking on Dblookup Mediator in Design View results in UI Crash ([#331](https://github.com/wso2/mi-vscode/issues/331))  
- Fixed: In the Enrich mediator, the `Inline Registry Key` dropdown does not display available Local Entries. ([#343](https://github.com/wso2/mi-vscode/issues/343))  
### Improvements

- Improved: Input Schema is not populated in the Data Mapper for CSV payload ([#177](https://github.com/wso2/mi-vscode/issues/177))  
- Improved: Instead of a placeholder, a predefined value is present in the form for adding case branches in the Switch mediator ([#202](https://github.com/wso2/mi-vscode/issues/202))  
- Improved: Improvement needed for datamapper search feature ([#225](https://github.com/wso2/mi-vscode/issues/225))  
- Improved: Improve Inbound and Connector form generator to support conditional rendering ([#236](https://github.com/wso2/mi-vscode/issues/236))
- Improved: Add option to define custom parameter for Inbound and Connectors ([#298](https://github.com/wso2/mi-vscode/issues/298))  
- Improved: Improve the form generator of the inbound endpoints ([#305](https://github.com/wso2/mi-vscode/issues/305))  
- Improved: In the `Call` mediator, the `Select Endpoint` dropdown does not require a button to indicate an expression (`Ex`). ([#316](https://github.com/wso2/mi-vscode/issues/316))  
- Improved: Improve sequence creation UX of inbound Endpoint creation form ([#326](https://github.com/wso2/mi-vscode/issues/326))  
- Improved: Show download progress of inbound endpoint connectors ([#329](https://github.com/wso2/mi-vscode/issues/329))  

## [1.0.4] - 2024-08-09
### Fixes
- Fixed: Salesforcerest Connector: Update view does not display field values after connection creation ([#109](https://github.com/wso2/mi-vscode/issues/109))
## [1.0.3] - 2024-08-01

### Fixes

- Fixed: <implementation> tag is added in cache mediator when "Max Entry Count" is empty ([#241](https://github.com/wso2/mi-vscode/issues/241))  
- Fixed: Adding a namespace for `Fast Xslt Dynamic SchemaKey` in `Fast XSLT` Mediator doesn't get saved.  ([#289](https://github.com/wso2/mi-vscode/issues/289))  
- Fixed: Cache mediator form generate invalid xml when editing ([#296](https://github.com/wso2/mi-vscode/issues/296))  

## [1.0.2] - 2024-07-31

### Fixes

- Fixed: Issue with trigger count of a scheduled task ([#110](https://github.com/wso2/mi-vscode/issues/110))  
- Fixed: Task form view mandate count parameter ([#170](https://github.com/wso2/mi-vscode/issues/170))  
- Fixed: Cannot delete cases of the switch case mediator ([#201](https://github.com/wso2/mi-vscode/issues/201))  
- Fixed: Cannot delete target from clone mediator ([#232](https://github.com/wso2/mi-vscode/issues/232))  
- Fixed: Drop mediator's description field is now mandatory in v1.0.0 ([#237](https://github.com/wso2/mi-vscode/issues/237))  
- Fixed: Typo in Local Entry creation form ([#243](https://github.com/wso2/mi-vscode/issues/243))  
- Fixed: New call endpoint creation form doesn't provide inline endpoint option ([#248](https://github.com/wso2/mi-vscode/issues/248))  
- Fixed: Connections associated with method calls are not rendered in Data Mapper ([#253](https://github.com/wso2/mi-vscode/issues/253))  
- Fixed: New inbound creation not shown when an inbound form is opened ([#254](https://github.com/wso2/mi-vscode/issues/254))  
- Fixed: Parameters are messed in Inbound endpoints ([#255](https://github.com/wso2/mi-vscode/issues/255))  
- Fixed: Inbound Endpoint hidden attributes are missing in source XML ([#264](https://github.com/wso2/mi-vscode/issues/264))  
- Fixed: Cannot uncheck attribute linked as enableCondition in Inbound endpoints ([#354](https://github.com/wso2/mi-vscode/issues/354))
### Improvements

Improved: Not possible to provide a description for the Aggregate mediator ([#174](https://github.com/wso2/mi-vscode/issues/174))  

## [1.0.1] - 2024-07-26

- Fixed inbound endpoint editing 
- Other minor bug fixes

## [1.0.0]

- Initial release
