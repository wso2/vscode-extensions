Next I need to plan and implement support for third party Devant connections

Devant third party connections allows Devant to manage your configurations(env variables) when your integration is running in Devant cloud. 
Third party connections could be created in the following ways and is only applicable if the workspace is associated with Devant(project level devant connection) or if there's an devant integration associated with workspace(component/integration level devant connection)
- From open api specification: User provides an openapi specification. the agent generates a custom connector(using createConnectorGeneratorTool tool) and initializes it. but when this integration runs in the cloud, the same runtime env variables needs available in Devant for things to work. Therefore, we need a tool that registers a third party service(with the env variables) and create a devant connection out of the registered third party service. Once we have that, we can use the configs from the devant connection to initialize the custom ballerina connector we created. 
- from existing ballerina connectors: Once we create a ballerina connection(initializing a ballerina connector) with configurations, it needs to work even when its deployed in Devant. Therefore we need to register a third party service in devant with runtime env variables, create a devant connection from that third party service and use the env configs from that devant connection when initializing the ballerina connector.
- creating from already registered service: there could be instances where a service has already been registered in Devant. if that service has on openapi spec, we can download the spec and move it into .choreo directory, create a custom connector from it and initialize it. if it doesn't have an openapi spec, then we need the agent to figure out the correct ballerina connector(or ask from user) and then initialize it with the configs from devant connection

- refer ballerina-extension/src/rpc-managers/platform-ext for rpc handlers and its recommended to reuse the same apis or whatever possible rather than reimplementing things
- refer ballerina-visualizer/src/views/BI/Connection/DevantConnections for how things are currently handled in the UI
- we are tying to bring in the same functionality provided through UI(with the help of rpc handlers) into agentic mode.
- all the existing devant related tools are in ballerina-extension/src/features/ai/agent/tools/devant
- when asking for actual runtime env variable values, we need to show a webview ui with env config name and the runtime value of the env config. we need a tool for this. the agent can send initial config keys as param and user can modify it as he wishes. when user submits, the register service tool needs to be invoked with the keys & values so that it can register the service in Devant side. you can refer how createConnectorGeneratorTool actually renders a UI and aks for user's values and build a new UI to collect the runtime env keys and values.

Devant Internal APIs are API services running in Devant and agentic tools to create internal connections has already been added. unline for internal REST api based connections, for third party ones, the agent needs to figure out the connector, use the configs and intialize the connector.



