/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export interface InboundConfig {
	name: string;
	port: number;
	type?: string;
	context?: string;
	schemaFilePath?: string;
}

export interface Endpoint extends InboundConfig {
	networkVisibilities?: string[];
}

export interface Inbound extends InboundConfig {
	networkVisibility?: string;
}

export interface Outbound {
	serviceReferences: ServiceReference[];
}

export interface ServiceReferenceEnv {
	from: string;
	to: string;
}

export interface ServiceReference {
	name: string;
	connectionConfig: string;
	connectionType: string;
	env?: ServiceReferenceEnv[];
}

// endpoint.yaml
export interface EndpointYamlContent {
	version: string;
	endpoints: EndpointYamlContentEndpoint[];
}

export interface EndpointYamlContentEndpoint extends InboundConfig {
	networkVisibility?: string;
}

export interface ComponentMetadata {
	name: string;
	projectName: string;
	annotations: Record<string, string>;
}

// component-config.yaml
export interface ComponentConfigYamlContent {
	apiVersion: "core.choreo.dev/v1beta1";
	kind: "ComponentConfig";
	// todo: remove metadata
	metadata?: ComponentMetadata;
	spec: {
		build?: { branch: string; revision?: string };
		image?: { registry: string; repository: string; tag: string };
		inbound?: Inbound[];
		outbound?: Outbound;
		configurations?: {
			keys?: { name: string; envName?: string; volume?: { mountPath: string } }[];
			groups?: {
				name: string;
				env?: { from: string; to: string }[];
				volume?: { mountPath: string; files: { from: string; to: string }[] }[];
			}[];
		};
	};
}

// component yaml v1.2
export interface ComponentYamlContent {
	schemaVersion: "1.0" | "1.1" | "1.2";
	/* optional Incoming connection details for the component */
	endpoints?: ComponentYamlEndpoint[];
	// TODO re-enable following after verifying the format
	/* optional Outgoing connection details for the component */
	// dependencies?: {
	// 	/* optional Defines the service references from the Internal Marketplace. */
	// 	serviceReferences?: ServiceReference[];
	// };
	/** optional Git based proxy related configs */
	proxy?: ProxyConfig;
	/** optional Outgoing connection details for the component. */
	dependencies?: {
		/** optional Defines the connection references from the Internal Marketplace. */
		connectionReferences?: ComponentYamlConnectionRef[];
		/** LEGACY (used with version 1.0).Defines the service references from the Internal Marketplace. */
		serviceReferences?: ServiceReference[];
	};
	/** optional Defines runtime configurations */
	configurations?: {
		/** optional List of environment variables to be injected into the component. */
		env?: EnvVar[];
		/** optional List of files to be injected into the component from config form */
		file?: ComponentYamlFileConfig[];
	};
}

interface EnvVar {
	name: string;
	valueFrom: ValueSource;
}

interface ValueSource {
	connectionRef?: ComponentYamlConnectionRef;
	configForm?: ComponentYamlConfigForm;
}

interface ComponentYamlConfigForm {
	displayName?: string;
	required?: boolean;
	type?: "string" | "number" | "boolean" | "secret" | "object" | "array";
}

interface ComponentYamlFileConfig {
	name: string;
	mountPath: string;
	type: "yaml" | "json" | "toml";
	values: ComponentYamlFileValue[];
}

interface ComponentYamlFileValue {
	name: string;
	valueFrom: ValueSource;
}

export interface ComponentYamlEndpoint {
	/*
	+required Unique name for the endpoint.
 	This name will be used when generating the managed API
	*/
	name: string;
	/* optional Display name for the endpoint. */
	displayName?: string;
	service: {
		/*
		optional Base path of the API that gets exposed via the endpoint.
    	This is mandatory if the endpoint type is set to REST or GraphQL.
		*/
		basePath?: string;
		/* required Numeric port value that gets exposed via the endpoint */
		port: number;
	};
	/*
	# required Type of traffic that the endpoint is accepting.
   	# Allowed values: REST, GraphQL, GRPC, TCP, UDP.
	*/
	type: string;
	/*
	optional Network level visibilities of the endpoint.
   	Takes priority over networkVisibility if defined. 
   	Accepted values: Project|Organization|Public(Default).
	*/
	networkVisibilities?: string[];
	/*
	optional The path to the schema definition file.
   	Defaults to wildcard route if not specified.
   	This is only applicable to REST endpoint types.
   	The path should be relative to the docker context.
	*/
	schemaFilePath?: string;
}

export interface ProxyConfig {
	/*
	# +required Type of traffic that the endpoint is accepting.
  	# Allowed values: REST, GraphQL, WS
	*/
	type: string;
	/*
	# +required The path to the schema definition file.
  	# This is only applicable to REST endpoint types.
	*/
	schemaFilePath: string;
	/*
	# +optional Network level visibilities of the endpoint.
  	# Takes priority over networkVisibility if defined.
  	# Accepted values: Organization|Public(Default).
	*/
	networkVisibilities?: string[];
	/** optional */
	thumbnailPath?: string;
	/** optional */
	docPath?: string;
}

export interface ComponentYamlConnectionRef {
	/** required Name of the connection. */
	name: string;
	/** required Name of the connection instance. service:/[project]/[component]/v1/[api-id]/visibility */
	resourceRef: string;
}
