# WSO2 Integrator: SI for Visual Studio Code

A VSCode extension which provides rich Siddhi development capabilities, such as IntelliSence, diagnostics, syntax highlighting, visual diagram editing, simulation, and exporting capabilities.

## Prerequisites

You need the following to work with the WSO2 Integrator: SI for VS Code extension.

- Java Development Kit (JDK)
- WSO2 Integrator: SI runtime

If these are not installed on your local machine, the VS Code extension will prompt you to download and configure them when a Siddhi application is opened for the first time after installing the extension.

If a different JDK or WSO2 Integrator SI version is installed on your local machine, you'll be prompted to download the required versions.

If the required JDK and SI versions are already installed, you can directly configure the Java Home and SI Home paths in this step.

## Features

### Language Support

#### Code Completions
* **Auto completion**: Context-aware auto completions powered by the Siddhi Language Server
* **IntelliSense**: Smart suggestions for Siddhi syntax, functions, and stream processors
* **Snippets**: Pre-built code templates for common Siddhi patterns and constructs

#### Diagnostics
* **Real-time error detection**: Semantic and syntactic error reporting as you type
* **Validation**: Comprehensive validation of Siddhi queries and applications
* **Quick fixes**: Automated suggestions to resolve common issues

#### Syntax Highlighting

* **Theme-aware highlighting**: Lexical elements highlighted in various colors based on your VSCode theme
* **Siddhi-specific syntax**: Specialized highlighting for streams, queries, functions, and other Siddhi constructs

### Visual Development

#### Diagram Editor

* **Visual query design**: Create and edit Siddhi applications using an intuitive drag-and-drop interface
* **Flow visualization**: Visualize data flow and stream processing logic graphically
* **Bidirectional editing**: Switch seamlessly between code view and diagram view
* **Real-time synchronization**: Changes in diagram automatically reflect in code and vice versa

### Execution & Testing

#### Run Siddhi Applications

* **Integrated runtime**: Execute Siddhi applications directly from VSCode
* **Console output**: View application logs and output in the integrated terminal

#### Event Simulation

##### Single Event Simulation

* **Manual event injection**: Send individual events to test specific scenarios
* **Custom event creation**: Define event attributes and values for targeted testing
* **Immediate feedback**: See real-time processing results for injected events

##### Multiple Event Simulation

* **Batch event processing**: Simulate multiple events with configurable timing intervals
* **Pattern-based generation**: Create events based on predefined patterns and rules
* **Load testing**: Test application performance with high-volume event streams

##### CSV File-based Simulation

* **File upload support**: Import event data from CSV files
* **Automated event generation**: Convert CSV rows into stream events automatically
* **Data mapping**: Map CSV columns to stream attributes with validation
* **Batch processing**: Process large datasets efficiently for comprehensive testing

##### Database-driven Simulation

* **Database connectivity**: Connect to various databases (MySQL, PostgreSQL, etc.)
* **Table-based simulation**: Use database tables as event sources
* **Dynamic querying**: Fetch and convert database records to stream events
* **Real-time data integration**: Simulate with live database data

### Deployment & Extensions

#### Export to Docker

* **Containerization**: Package Siddhi applications into Docker containers
* **Deployment-ready images**: Generate production-ready Docker images with all dependencies
* **Configuration management**: Customize runtime configurations for different environments

#### Extension Installer

* **Extension management**: Install, update, and manage Siddhi extensions
* **Dependency resolution**: Automatic handling of extension dependencies
* **Extension discovery**: Browse and search available extensions from the Siddhi ecosystem

## Samples

Need inspiration? Browse through sample use cases to see how WSO2 Integrator: SI handles real-world integrations. [Explore Samples](https://si.docs.wso2.com/guides/use-cases/)

## Reach Out

For further assistance, create a [GitHub issue](https://github.com/wso2/product-streaming-integrator/issues). Our team will review and respond promptly to address your concerns.
