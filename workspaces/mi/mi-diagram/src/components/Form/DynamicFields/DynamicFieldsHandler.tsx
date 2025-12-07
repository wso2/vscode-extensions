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

import { Element, getNameForController, DynamicField, DynamicFieldGroup } from '../FormGenerator';

interface ConnectionParameter {
    name: string;
    value: string;
}

interface ConnectionInfo {
    name: string;
    parameters: ConnectionParameter[];
}

interface DbCredentials {
    className: string;
    username: string;
    password: string;
    url: string;
    driverPath?: string;
}

interface TestDbConnectionArgs extends DbCredentials {
    dbType: string;
    host: string;
    port: string;
    dbName: string;
}

type FetchTablesResponse = Record<string, any>;

interface OnValueChangeParams {
    target?: string | string[];
    rpc?: string;
    queryType?: 'select' | 'insert' | 'delete' | 'call';
    resultField?: string;
    preparedResultField?: string;
    columnTypesField?: string;
    columnNamesField?: string;
    targetCombo?: string[];
    onDynamicFieldChange?: OnValueChangeConfig;
}
interface OnValueChangeConfig {
    function: string;
    params?: OnValueChangeParams[];
}

// Interface for the structure holding dynamic field values during query build/parse
interface DynamicFieldValue {
    value?: string;
    isExpression?: boolean;
    columnType?: string;
    columnName?: string;
    name: string; // Original dynamic field name
    displayName: string; // User-friendly column name
    helpTip: string;
}

export interface DynamicFieldsHandlerProps {
    rpcClient: any;
    formData: any;
    getValues: (name?: string | string[]) => any;
    setValue: (name: string, value: any, options?: object) => void;
    setComboValues?: (elementName: string, newValues: string[]) => void;
    documentUri?: string;
    parameters: any;
    dynamicFields: Record<string, DynamicFieldGroup>;
    setDynamicFields: (newFields: Record<string, DynamicFieldGroup>) => void;
    setCustomError: (fieldName: string, message: string | null) => void;
    updateElements?: (elements: Element[]) => void;
    connectionName?: string;
    comboValuesMap?: any;
}

// --- Constants ---
const FIELD_NAMES = {
    CONFIG_KEY: 'configKey',
    CONFIG_REF: 'configRef',
    COLUMNS: 'columns',
    QUERY_TYPE: 'queryType',
    QUERY: 'query',
    ORDER_BY: 'orderBy',
    LIMIT: 'limit',
    OFFSET: 'offset',
    USER_CONSENT: 'userConsent',
    DRIVER_CLASS: 'driverClass',
    DB_USER: 'dbUser',
    DB_PASSWORD: 'dbPassword',
    DB_URL: 'dbUrl',
    GROUP_ID: 'groupId',
    ARTIFACT_ID: 'artifactId',
    VERSION: 'version',
    DRIVER_PATH: 'driverPath',
    CONNECTION_TYPE: 'connectionType',
    CONNECTION_NAME: 'name',
    ASSISTANCE_MODE: 'assistanceMode',
    RESPONSE_COLUMNS: 'responseColumns',
    TABLE_NAME: 'table',
};

const QUERY_TYPES = {
    SELECT: 'select',
    INSERT: 'insert',
    DELETE: 'delete',
    CALL: 'call',
};

const UI_MODES = {
    ONLINE: 'online',
    OFFLINE: 'offline',
};

const ERROR_MESSAGES = {
    COMPLEX_QUERY: 'This query structure is not supported by this simplified operation. Please use the "Execute Query" operation for complex or custom SQL.',
    TABLE_NOT_FOUND: 'Query contains a table (relation) that is not present in the database. Check the table name or use the ExecuteQuery operation which supports complex/custom SQL queries.',
    FIELD_NOT_FOUND: 'Query contains fields/columns that are not present in the selected table. Check the query or use the ExecuteQuery operation which supports complex/custom SQL queries.',
    INSERT_MISMATCH: 'Column count does not match value count in INSERT statement.',
    CALL_MISMATCH: 'Column count does not match value count in CALL statement.',
    CONNECTION_FAILED: 'Database connection failed. Please check your connection parameters or DB driver. Using Offline mode.',
    DRIVER_CLASS_LOAD_ERROR: 'Error loading database driver class. Please ensure the driver is correctly configured.',
    CONNECTION_VALIDATION_ERROR: 'Error validating database connection.',
    PERMISSION_OR_CONFIG_ERROR: 'Connection invalid, incomplete, or user consent not provided.',
    GENERIC_FETCH_ERROR: 'Error fetching data.',
    PARSE_WHERE_CONDITION: 'Could not parse WHERE condition',
    PARSE_INSERT_VALUE: 'Error parsing INSERT values',
};

const REGEX = {
    EXPRESSION: /(\{[^\s"][^,<>\n}]*\})/,
    SYNAPSE_EXPRESSION: /^\$\{((?:.|\s)*)\}$/,
    DYNAMIC_FIELD_NAME: /^dyn_param_([^_]+)_([^_]+)_(.+)$/,
    SELECT: /^SELECT\s+(?<columns>.*?)\s+FROM\s+(?<tableName>[\w."`\[\]]+)(?:\s+WHERE\s+(?<whereClause>.*?))?(?:\s+ORDER BY\s+(?<orderBy>.*?))?(?:\s+LIMIT\s+(?<limit>\d+|\$\{[^}]+\}))?(?:\s+OFFSET\s+(?<offset>\d+|\$\{[^}]+\}))?\s*$/i,
    INSERT: /^INSERT\s+INTO\s+(?<tableName>[\w."`\[\]]+)\s*\((?<columns>.*?)\)\s+VALUES\s*\((?<values>.*?)\)\s*$/i,
    DELETE: /^DELETE\s+FROM\s+(?<tableName>[\w."`\[\]]+)(?:\s+WHERE\s+(?<whereClause>.*?))?\s*$/i,
    CALL: /^CALL\s+(?<tableName>[\w."`\[\]]+)\s*\((?<values>.*?)\)\s*$/i,
    WHERE_CONDITION_PAIR: /^\s*([`"'\[\]\w\s,.-]+)\s*(=|>|<|>=|<=|!=|LIKE|ILIKE|IS(?:\s+NOT)?\s+NULL)\s*(.*?)\s*$/i,
    COLUMN_TYPE_FROM_HELPTIP: /Column type: (.*)/,
};

const EXPRESSION_TYPES = ['stringOrExpression', 'integerOrExpression', 'expression', 'keyOrExpression', 'resourceOrExpression',
    'textOrExpression', 'textAreaOrExpression', 'stringOrExpression'
];

const NO_QUOTES_SQL_TYPES = ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'BOOLEAN', 'BIT', 'DATE', 'TIME', 'TIMESTAMP', 'DATETIME'];

export class DynamicFieldsHandler {
    private readonly rpcClient: any;
    private readonly formData: any; // Or specific type
    private readonly getValues: DynamicFieldsHandlerProps['getValues'];
    private readonly setValue: DynamicFieldsHandlerProps['setValue'];
    private readonly setComboValues: DynamicFieldsHandlerProps['setComboValues'];
    private readonly documentUri: string;
    private dynamicFields: Record<string, DynamicFieldGroup>;
    private readonly setDynamicFields: DynamicFieldsHandlerProps['setDynamicFields'];
    private readonly setCustomError: DynamicFieldsHandlerProps['setCustomError'];
    private readonly parameters: any;
    private readonly connectionName: string;

    constructor(props: DynamicFieldsHandlerProps) {
        this.rpcClient = props.rpcClient;
        this.formData = props.formData;
        this.getValues = props.getValues;
        this.setValue = props.setValue;
        this.setComboValues = props.setComboValues;
        this.documentUri = props.documentUri ?? '';
        this.dynamicFields = props.dynamicFields;
        this.setDynamicFields = (newFields: Record<string, DynamicFieldGroup>) => {
            this.dynamicFields = newFields
            props.setDynamicFields(this.dynamicFields);
        };
        this.parameters = props.parameters;
        this.setCustomError = props.setCustomError;
        this.connectionName = props.connectionName;
    }

    /** Handles value changes for elements configured with onValueChange */
    public handleValueChange = async (value: any, fieldName: string, element: Element): Promise<void> => {
        const config = element?.onValueChange;
        if (!config?.function) return;

        try {
            switch (config.function) {
                case 'handleDynamicContent':
                    if (element.inputType === 'string' && element.name === FIELD_NAMES.TABLE_NAME) {
                        const parentElement = this.findElementByName(this.formData.elements, FIELD_NAMES.TABLE_NAME);
                        const queryBuildConfig = parentElement?.onValueChange?.params?.[0]?.onDynamicFieldChange?.params?.[0];
                        await this._buildQueryFromDynamicFields(FIELD_NAMES.TABLE_NAME, queryBuildConfig?.queryType , queryBuildConfig, element);
                    } else {
                        await this._handleDynamicContentChange(value, fieldName, element);
                    }
                    break;
                case 'updateTargetCombo':
                    if (config.params?.[0]?.target && config.params?.[0]?.rpc) {
                        await this.onConnectionChange(config.params[0].target, config.params?.[0].rpc);
                    }
                    break;
                case 'buildQuery':
                    const parentField = (element as any).parentField;
                    if (parentField) {
                        await this.onDynamicFieldChange(value, element, parentField);
                    } else {
                        console.warn(`'buildQuery' called without parentField for element:`, element.name);
                    }
                    break;
                case 'handleAssistanceMode':
                    if (config.params?.[0]?.target && config.params?.[0]?.rpc) {
                        await this._handleAssistanceModeChange(value,config.params[0].target, config.params?.[0].rpc);
                    }
                    break;
                default:
                    console.warn(`Unknown onValueChange function: ${config.function}`);
            }
        } catch (error) {
            console.error(`Error handling value change for field '${fieldName}':`, error);
            this.setCustomError(getNameForController(fieldName), "Error processing field change.");
        }
    };

    /** Fetches dynamic fields when a related field changes */
    public fetchDynamicFields = async (
        element: Element, // The element triggering the change
        selectedValue: string,
        parentFieldName: string
    ): Promise<DynamicField[] | null> => {
        try {
            // //if offline mode do not fetch dynamic fields
            // if(element.inputType === 'string' && element.name === FIELD_NAMES.TABLE_NAME) {
            //     return undefined;
            // }
            const connectionInfo = await this._getValidConnectionDetails();
            if (!connectionInfo) {
                this._clearDynamicFields(parentFieldName);
                return undefined;
            }
            // if selected value is empty
            if (!selectedValue) {
                this._clearDynamicFields(parentFieldName);
                return null;
            }
            //Get columns for the table
            const rpcClientInstance = this.rpcClient.getMiDiagramRpcClient();
            const response = await rpcClientInstance.getDynamicFields({
                connectorName: this._getConnectorName(),
                operationName: this.formData.operationName,
                fieldName: parentFieldName,
                selectedValue: selectedValue,
                connection: connectionInfo,
            });
            const newFields = response.columns || [];
            // Augment dynamic fields with necessary context for later use
            const onDynamicFieldChangeConfig = element?.onValueChange?.params?.[0]?.onDynamicFieldChange;
            newFields.forEach((field: any) => {
                field.value.parentField = parentFieldName;
                if (onDynamicFieldChangeConfig) {
                    field.value.onValueChange = onDynamicFieldChangeConfig;
                }
            });

            this.setCustomError(getNameForController(parentFieldName), null);
            return newFields;

        } catch (error) {
            console.error('Error fetching dynamic fields:', error);
            this.setCustomError(getNameForController(parentFieldName), ERROR_MESSAGES.GENERIC_FETCH_ERROR);
            this._clearDynamicFields(parentFieldName);
            return null; // Indicate error
        }
    };

    /** Handles changes in the selected DB connection */
    public onConnectionChange = async (targetField: string | string[], rpc?: string): Promise<void> => {
        const targetFields = Array.isArray(targetField) ? targetField : [targetField];

        try {
            // Attempt to get connection and validate it. Errors/banners set inside.
            const connectionInfo = await this._getValidConnectionDetails();
            if (!connectionInfo) {
                this._updateUiForConnectionState(false, targetFields, {}); // Offline state
                return;
            }

            // Fetch tables only if connection is valid
            const tables = await this._fetchTablesForConnection(connectionInfo, rpc, targetFields[0]);
            this._updateUiForConnectionState(true, targetFields, tables); // Online state

        } catch (error) {
            console.error('Error processing connection change:', error);
            this.setCustomError(getNameForController(FIELD_NAMES.CONFIG_KEY), ERROR_MESSAGES.CONNECTION_VALIDATION_ERROR);
            this._updateUiForConnectionState(false, targetFields, {}); // Revert to offline state on error
        }
    };

    /** Builds or parses the SQL query when dynamic fields or the query field itself changes */
    public onDynamicFieldChange = async (value: any, element: any, parentField: string): Promise<void> => {
        try {
            const parentElement = this.findElementByName(this.formData.elements, parentField);
            const queryBuildConfig = parentElement?.onValueChange?.params?.[0]?.onDynamicFieldChange?.params?.[0];

            if (!queryBuildConfig?.queryType || !queryBuildConfig.resultField || !queryBuildConfig.preparedResultField || !queryBuildConfig.columnNamesField || !queryBuildConfig.columnTypesField) {
                console.warn(`'buildQuery' configuration is incomplete for parent field: ${parentField}`);
                return;
            }
            const operationType = queryBuildConfig.queryType;

            // Case 1: User manually edited the main query field
            if (element.name === queryBuildConfig.resultField) {
                await this._handleManualQueryChange(value, parentField, operationType, queryBuildConfig, element);
            }
            // Case 2: A dynamic field (or param manager) changed, rebuild query
            else {
                await this._buildQueryFromDynamicFields(parentField, operationType, queryBuildConfig, element);
            }

        } catch (error) {
            console.error('Error in onDynamicFieldChange:', error);
            if (!(error instanceof Error && error.message.startsWith('Query parsing error:'))) { // Avoid double banner
                this.setCustomError(getNameForController(element.name), "Error processing field change.");
            }
        }
    };

    /** Recursively finds an element definition by name */
    public findElementByName = (elements: Element[], name: string): Element | null => {
        for (const element of elements as any[]) {
            if (element.type !== 'attributeGroup' && element.value.name === name) {
                return element.value;
            }

            if (element.type === 'attributeGroup') {
                const result = this.findElementByName(element.value.elements, name);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    };

    /** Recursively sets the hidden property of an element (Warning: Mutates elements) */
    public setElementVisibility = (elements: any[] | undefined, name: string, isHidden: boolean): boolean => {
        if (!elements) return false;

        for (const element of elements) {
            if (element.type !== 'attributeGroup' && element.value?.name === name) {
                if (name === FIELD_NAMES.TABLE_NAME || name === FIELD_NAMES.ORDER_BY) {
                    let updatedOffline = false;
                    let updatedOnline = false;
                    if (isHidden) {
                        if (element?.enableCondition?.[0]?.queryType === UI_MODES.OFFLINE) {
                            element.value.hidden = true;
                            updatedOffline = true;
                        }
                        if (element?.enableCondition?.[0]?.queryType === UI_MODES.ONLINE) {
                            element.value.hidden = false;
                            updatedOnline = true;
                        }
                    } else {
                        if (element?.enableCondition?.[0]?.queryType === UI_MODES.ONLINE) {
                            element.value.hidden = true;
                            updatedOnline = true;
                        }
                        if (element?.enableCondition?.[0]?.queryType === UI_MODES.OFFLINE) {
                            element.value.hidden = false;
                            updatedOffline = true;
                        }
                    }
                    if (updatedOffline && updatedOnline) {
                        return true;
                    }

                } else {
                    element.value.hidden = isHidden;
                    return true; // Found and set
                }
            }
            if (element.type === 'attributeGroup' && element.value?.elements) {
                if (this.setElementVisibility(element.value.elements, name, isHidden)) {
                    return true; // Found in subgroup
                }
            }
        }
        return false; // Not found
    };

    // --- Private Helper Methods ---

    /** Handles the specific logic for 'handleDynamicContent' onChange */
    private async _handleDynamicContentChange(value: any, fieldName: string, element: Element): Promise<void> {
        const newFields = await this.fetchDynamicFields(element, value, fieldName);
        // Update dynamic fields state only if fetch was successful (newFields is not null)
        if (newFields !== null && newFields !== undefined) {
            //let augmentedFields = newFields;
            if (element.onValueChange?.params?.[0]?.onDynamicFieldChange.params?.[0]?.queryType === QUERY_TYPES.SELECT) {
                const augmentedFields: typeof newFields = [];
                newFields.forEach((field: any) => {
                    // Original field
                    augmentedFields.push(field);
                    // Extra checkbox field for "Include in Response"
                    augmentedFields.push({
                        ...field,
                        value: {
                            ...field.value,
                            name: `${field.value.name}_include`,
                            columnName: field.value.displayName,
                            helpTip: `Check to include the column '${field.value.displayName}' in the SELECT response.`,
                            displayName: field.value.displayName.charAt(0).toUpperCase() + field.value.displayName.slice(1),
                            inputType: "checkbox",
                            defaultValue: false,
                            parentField: fieldName,
                        },
                    });
                });
                this.setDynamicFields({
                    ...this.dynamicFields, [fieldName]: {
                        header: "Table Columns",
                        fields: augmentedFields,
                    },
                });
            } else if (element.onValueChange?.params?.[0]?.onDynamicFieldChange.params?.[0]?.queryType === QUERY_TYPES.CALL) {
                this.setDynamicFields({
                    ...this.dynamicFields, [fieldName]: {
                        header: "Parameters",
                        fields: newFields,
                    },
                });
            } else {
                this.setDynamicFields({
                    ...this.dynamicFields, [fieldName]: {
                        header: "Table Columns",
                        fields: newFields,
                    },
                });
            }

            // Update target combos if configured
            const targetCombos = element.onValueChange?.params?.[0]?.targetCombo;
            if (targetCombos && this.setComboValues) {
                const comboOptions = newFields.map((field: DynamicField) => field.value.displayName);
                targetCombos.forEach(async (comboItem: string) => {
                    this.setComboValues(comboItem, comboOptions);
                    // if combooptions is empty trigger the onDynamicFieldChange
                    if (comboOptions.length === 0) {

                        // dummy empty element to trigger the onDynamicFieldChange
                        const dummyElement = {
                            name: comboItem,
                            value: {
                                name: comboItem,
                                displayName: comboItem,
                                value: "",
                                inputType: 'stringOrExpression',
                                hidden: false,
                                onValueChange: element.onValueChange?.params?.[0]?.onDynamicFieldChange,
                                parentField: fieldName,
                            },
                        };

                        const tempElem = this.findElementByName(this.formData.elements, FIELD_NAMES.COLUMNS);
                        if (tempElem) {
                            await this.onDynamicFieldChange(dummyElement.value, dummyElement, fieldName);
                        }
                    }

                });
            }
        } else {

            // check if opened form inside connection
            if (this.connectionName && this.connectionName.trim() !== '' && newFields !== undefined) {

                // get the configRef element from formData
                const configRefElement = this.findElementByName(this.formData.elements, FIELD_NAMES.CONFIG_REF);
                if (configRefElement) {
                    // trigger onConnectionChnage since the connection element does not exist
                    await this.onConnectionChange(configRefElement.onValueChange.params[0].target as string,
                        configRefElement.onValueChange.params[0].rpc);
                }
            } else {

                // Fetch failed or connection invalid, clear relevant dynamic fields and combos
                this._clearDynamicFields(fieldName);
                const targetCombos = element.onValueChange?.params?.[0]?.targetCombo;
                if (targetCombos && this.setComboValues) {
                    targetCombos.forEach((comboItem: string) => this.setComboValues!(comboItem, []));
                }

            }

        }
    }

    /** Clears dynamic fields for a specific parent */
    private _clearDynamicFields(parentFieldName: string): void {
        const newDynamicFields = { ...this.dynamicFields };
        delete newDynamicFields[parentFieldName];
        this.setDynamicFields(newDynamicFields);
    }


    /** Updates UI state based on connection validity (online/offline) */
    private _updateUiForConnectionState(
        isOnline: boolean,
        targetFields: string[],
        tables: FetchTablesResponse
    ): void {
        this.setElementVisibility(this.formData.elements, FIELD_NAMES.COLUMNS, isOnline); // Hide columns if offline
        this.setElementVisibility(this.formData.elements, FIELD_NAMES.RESPONSE_COLUMNS, isOnline); // Show response columns if online

        this.setElementVisibility(this.formData.elements, FIELD_NAMES.TABLE_NAME, isOnline); // Show table name if online
        this.setElementVisibility(this.formData.elements, FIELD_NAMES.ORDER_BY, isOnline); // Show order by if online
        //this.setElementVisibility(this.formData.elements, FIELD_NAMES.ASSISTANCE_MODE, isOnline);
        //this.setElementVisibility(this.formData.elements, FIELD_NAMES.TABLE_NAME_OFFLINE, isOnline); // Show table name offline if offline

        //const userConsent = connection.parameters?.find(p => p.name === FIELD_NAMES.USER_CONSENT)?.value;

        this.setValue(FIELD_NAMES.QUERY_TYPE, isOnline ? UI_MODES.ONLINE : UI_MODES.OFFLINE);
        //this.setValue(FIELD_NAMES.ASSISTANCE_MODE, this.getValues(FIELD_NAMES.QUERY_TYPE) === UI_MODES.ONLINE ? true : false);
        const tableNames = isOnline ? Object.keys(tables) : [];

        if (this.setComboValues) {

            targetFields.forEach((field) => {
                const currentFieldValue = this.getValues(field);
                this.setComboValues!(field, tableNames);
                if (!isOnline) {
                    this.setValue(field, undefined); // Clear current value if going offline
                }
                // if currentFieldValue is not in the list set it to the first item
                if (currentFieldValue !== undefined && tableNames.length > 0 && !tableNames.includes(currentFieldValue)) {
                    this.setValue(field, tableNames[0]);
                }
            });
        }

        // Clear dynamic fields if going offline
        if (!isOnline) {
            targetFields.forEach(parentField => this._clearDynamicFields(parentField));
        }
    }

    /** Gets the configured connector name */
    private _getConnectorName(): string {
        const name = this.formData?.connectorName;
        return typeof name === 'string' ? name.replace(/\s/g, '') : 'db-connector';
    }

    /** Fetches connection details for the currently selected configKey */
    private async _getDbConnectionDetails(): Promise<ConnectionInfo | undefined> {
        try {
            const rpcClientInstance = this.rpcClient.getMiDiagramRpcClient();
            const connectorData = await rpcClientInstance.getConnectorConnections({
                documentUri: this.documentUri,
                connectorName: this._getConnectorName(),
            });

            // Prioritize connectionName prop if available and not empty
            let configRefValue = this.connectionName && this.connectionName.trim() !== ''
                ? this.connectionName
                : this.getValues(getNameForController(FIELD_NAMES.CONFIG_KEY));

            const connection = connectorData.connections.find((c: { name: any; }) => c.name === configRefValue);

            // if configRef is ""/connection is undefined set the first connection as default
            if (!connection && connectorData.connections.length > 0) {
                // get all values
                this.setValue(getNameForController(FIELD_NAMES.CONFIG_KEY), connectorData.connections[0].name);
                return connectorData.connections[0];
            }

            return connection;
        } catch (error) {
            console.error("Error fetching connection details:", error);
            this.setCustomError(getNameForController(FIELD_NAMES.CONFIG_KEY), "Failed to retrieve connection details.");
            return undefined;
        }
    }

    /** Gets connection details and validates them (permission, params, test connection) */
    private async _getValidConnectionDetails(): Promise<ConnectionInfo | undefined> {
        const connection = await this._getDbConnectionDetails();

        if (!connection) {
            return undefined;
        }
        // 1. Check User Consent
        const userConsent = connection.parameters?.find(p => p.name === FIELD_NAMES.USER_CONSENT)?.value;
        if (userConsent !== 'true') {
            this.setElementVisibility(this.formData.elements, FIELD_NAMES.ASSISTANCE_MODE, true); // Hide assistance mode if no user consent
            return undefined; // Not an error, but not valid for operations
        }
        this.setElementVisibility(this.formData.elements, FIELD_NAMES.ASSISTANCE_MODE, false); // Show assistance mode if have user consent
        if(this.findElementByName(this.formData.elements, FIELD_NAMES.QUERY_TYPE)?.currentValue) {
            if(this.findElementByName(this.formData.elements, FIELD_NAMES.QUERY_TYPE)?.currentValue === UI_MODES.OFFLINE && this.getValues(FIELD_NAMES.QUERY_TYPE) === UI_MODES.OFFLINE) {
                this.setValue(FIELD_NAMES.ASSISTANCE_MODE, false);
                return undefined;
            } else {
                this.setValue(FIELD_NAMES.ASSISTANCE_MODE, true);
            }
        } else {
            this.setValue(FIELD_NAMES.ASSISTANCE_MODE, true);
        }

        // 2. Check Required Parameters exist
        const requiredParams = [FIELD_NAMES.DRIVER_CLASS, FIELD_NAMES.DB_USER, FIELD_NAMES.DB_PASSWORD, FIELD_NAMES.DB_URL, FIELD_NAMES.CONNECTION_TYPE];
        const hasAllParams = requiredParams.every(paramName =>
            connection.parameters?.some(p => p.name === paramName && p.value)
        );

        if (!hasAllParams) {
            this.setCustomError(getNameForController(FIELD_NAMES.CONFIG_KEY),
                ERROR_MESSAGES.PERMISSION_OR_CONFIG_ERROR + " (Missing parameters)");
            return undefined;
        }

        // 3. Test the Connection via RPC
        try {
            let groupId = connection.parameters.find(p => p.name === FIELD_NAMES.GROUP_ID)?.value;
            let artifactId = connection.parameters.find(p => p.name === FIELD_NAMES.ARTIFACT_ID)?.value;
            let version = connection.parameters.find(p => p.name === FIELD_NAMES.VERSION)?.value;
            let driverPath = connection.parameters.find(p => p.name === FIELD_NAMES.DRIVER_PATH)?.value;
            let connectorName = this._getConnectorName();
            let connectionType = this._getConnectionDbType(connection);
            if (!groupId || !artifactId || !version) {
                const driverDetails = await this.rpcClient.getMiDiagramRpcClient().getDriverMavenCoordinates({ filePath: driverPath, connectionType: connectionType, connectorName: connectorName });
                groupId = driverDetails.groupId;
                artifactId = driverDetails.artifactId;
                version = driverDetails.version;
            }

            let isDriverDownloaded = false;
            let retryCount = 0;
            const maxRetries = 5;   
            if (!driverPath) {
                while (!isDriverDownloaded && retryCount < maxRetries) {
                    const args = {
                        groupId: groupId,
                        artifactId: artifactId,
                        version: version,
                    };
                    this.setCustomError(getNameForController(FIELD_NAMES.CONFIG_KEY), "Checking DB Driver...");
                    driverPath = await this.rpcClient.getMiDiagramRpcClient().downloadDriverForConnector(args);
                    if (driverPath) {
                        isDriverDownloaded = true;
                    }
                    retryCount++;
                }
            }
            if (!isDriverDownloaded) {
                this.setCustomError(getNameForController(FIELD_NAMES.CONFIG_KEY), "Failed to download the DB driver after 5 attempts.");
            }
            connection.parameters.push({
                name: FIELD_NAMES.DRIVER_PATH,
                value: driverPath,
            });
            const testArgs: TestDbConnectionArgs = {
                className: connection.parameters.find(p => p.name === FIELD_NAMES.DRIVER_CLASS)!.value,
                username: connection.parameters.find(p => p.name === FIELD_NAMES.DB_USER)!.value,
                password: connection.parameters.find(p => p.name === FIELD_NAMES.DB_PASSWORD)!.value,
                url: connection.parameters.find(p => p.name === FIELD_NAMES.DB_URL)!.value,
                driverPath: driverPath,
                dbType: '',
                host: '', port: '', dbName: ''
            };
            const testResult = await this.rpcClient.getMiDiagramRpcClient().loadDriverAndTestConnection(testArgs);
            if (!testResult.success) {
                this.setCustomError(getNameForController(FIELD_NAMES.CONFIG_KEY),
                    ERROR_MESSAGES.CONNECTION_FAILED + (testResult.message ? `: ${testResult.message}` : ''));
                    this.setValue(FIELD_NAMES.ASSISTANCE_MODE, false);
                    this.setValue(FIELD_NAMES.QUERY_TYPE, UI_MODES.OFFLINE);
                    //this._handleAssistanceModeChange(false, FIELD_NAMES.ASSISTANCE_MODE, "hide");
                return undefined; // Connection failed, set error message
            } else {
                this.setCustomError(getNameForController(FIELD_NAMES.CONFIG_KEY), null);
            }
            return connection;

        } catch (error) {
            console.error("Error testing DB connection:", error);
            this.setCustomError(FIELD_NAMES.CONFIG_KEY, ERROR_MESSAGES.CONNECTION_FAILED + " (RPC Error)");
            this.setValue(FIELD_NAMES.ASSISTANCE_MODE, false);
            this.setValue(FIELD_NAMES.QUERY_TYPE, UI_MODES.OFFLINE);
            return undefined;
        }
    }

    /** Fetches database tables for a given valid connection */
    private async _fetchTablesForConnection(connectionInfo: ConnectionInfo, rpc?: string, elementName?: string): Promise<FetchTablesResponse> {
        try {
            const credentials: DbCredentials = {
                className: connectionInfo.parameters.find(p => p.name === FIELD_NAMES.DRIVER_CLASS)!.value,
                username: connectionInfo.parameters.find(p => p.name === FIELD_NAMES.DB_USER)!.value,
                password: connectionInfo.parameters.find(p => p.name === FIELD_NAMES.DB_PASSWORD)!.value,
                url: connectionInfo.parameters.find(p => p.name === FIELD_NAMES.DB_URL)!.value,
                driverPath: connectionInfo.parameters.find(p => p.name === FIELD_NAMES.DRIVER_PATH)?.value,
            };
            let tables;
            if (rpc === "getStoredProcedures") {
                tables = await this.rpcClient.getMiDiagramRpcClient().getStoredProcedures(credentials);
                tables = Object.fromEntries(tables.map((key: string) => [key, true]));
            } else {
                tables = await this.rpcClient.getMiDiagramRpcClient().fetchDSSTables(credentials);
            }

            return tables || {};

        } catch (error) {
            this.setCustomError(getNameForController(elementName!), "Failed to fetch database tables.");
            console.error('Error fetching database tables:', error);
            return {};
        }
    }

    /** Gets the database type (e.g., 'mysql', 'postgresql') from connection parameters */
    private _getConnectionDbType(connectionInfo: ConnectionInfo | undefined): string | undefined {
        return connectionInfo?.parameters?.find(p => p.name === FIELD_NAMES.CONNECTION_TYPE)?.value;
    }

    /** Collects values from the dynamic fields associated with a parent field */
    private _getDynamicFieldValues(
        parentField: string,
        element: Element,
        operationType?: string
    ): Record<string, DynamicFieldValue> {
        const formValues = this.getValues();
        const currentQueryType = formValues[FIELD_NAMES.QUERY_TYPE] ?? UI_MODES.OFFLINE;
        const collectedValues: Record<string, DynamicFieldValue> = {};

        // Handling ParamManager (Offline Mode)
        
        if (currentQueryType === UI_MODES.OFFLINE) {
            const paramManagerValues = formValues[FIELD_NAMES.COLUMNS] || [];
            if (Array.isArray(paramManagerValues)) {
                let count = 0;
                for (const column of paramManagerValues) {
                    if (operationType === QUERY_TYPES.CALL) { column.columnName = `param_${++count}`; }
                    if (!column.columnName) continue; // Skip if columnName is missing

                    const normalizedName = column.columnName.replace(/[^a-zA-Z0-9_]/g, '_');
                    collectedValues[normalizedName] = {
                        value: column.columnValue?.value,
                        isExpression: column.columnValue?.isExpression,
                        columnType: column.propertyType?.value,
                        name: normalizedName,
                        displayName: column.columnName,
                        helpTip: '',
                    };
                }
            }
            //Handling Response Columns (SELECT only)
            if ( operationType === QUERY_TYPES.SELECT && typeof formValues[FIELD_NAMES.RESPONSE_COLUMNS] === 'string' &&
            formValues[FIELD_NAMES.RESPONSE_COLUMNS].trim() !== '') {
                const selectColumns = formValues[FIELD_NAMES.RESPONSE_COLUMNS].split(',').map((col: string) => col.trim()).filter((col: string) => col);
                for (const col of selectColumns) {
                    const colName = col.replace(/[^a-zA-Z0-9_]/g, '_');
                    collectedValues[colName + '_include'] = {
                        value: 'true',
                        isExpression: false,
                        columnType: '',
                        name: colName + '_include',
                        displayName: colName,
                        columnName: colName,
                        helpTip: '',
                    };
                }
            }


            // set UI mode to offline if not already set
            if (currentQueryType !== UI_MODES.OFFLINE) {
                this.setValue(FIELD_NAMES.QUERY_TYPE, UI_MODES.OFFLINE);
            }
            return collectedValues;
        }

        // Handling dynamically generated fields (Online Mode)
        if (!this.dynamicFields[parentField]) {
            console.warn(`No dynamic fields found for parent field: ${parentField}`);
            return {};
        }
        const fieldsDefinition = this.dynamicFields[parentField].fields;
        if (!fieldsDefinition) return {};

        fieldsDefinition.forEach(field => {
            const fieldDef = field.value;
            const fieldCtrlName = getNameForController(fieldDef.name);
            const formValue = formValues[fieldCtrlName];

            const match = fieldDef.name.match(REGEX.DYNAMIC_FIELD_NAME);
            let originalColumnName = fieldDef.displayName;
            let columnType = undefined;
            if (match) {
                //originalColumnName = match[3];
                columnType = match[2];
            }

            const value = (typeof formValue === 'object' && formValue !== null && 'value' in formValue) ? formValue.value : formValue;
            const isExpression = (typeof formValue === 'object' && formValue !== null && 'isExpression' in formValue) ? formValue.isExpression : false;

            collectedValues[originalColumnName] = {
                value: value,
                isExpression: isExpression,
                columnType: columnType,
                name: fieldDef.name,
                displayName: fieldDef.displayName,
                columnName: fieldDef.columnName,
                helpTip: fieldDef.helpTip
            };
        });

        // set UI mode to online if not already set
        if (currentQueryType !== UI_MODES.ONLINE) {
            this.setValue(FIELD_NAMES.QUERY_TYPE, UI_MODES.ONLINE);
        }

        return collectedValues;
    }


    /** Encodes column names based on DB type for safe use in queries */
    private _encodeColumnName(columnName: string, dbType?: string): string {
        const type = dbType?.toLowerCase() ?? 'default';
        switch (type) {
            case 'mysql':
                return `\`${columnName.replace(/`/g, '``')}\``;
            case 'postgresql':
            case 'oracle':
            case 'ibm db2':
                return `"${columnName.replace(/"/g, '""')}"`;
            case 'microsoft sql server':
                return `[${columnName.replace(/]/g, ']]')}]`;
            default:
                return `"${columnName.replace(/"/g, '""')}"`;
        }
    }

    /** Checks if a value likely represents a numeric or boolean type based on helpTip */
    private _checkNoQuotesNeeded(field: DynamicFieldValue): boolean {
        // 1. Check explicit columnType first if available
        if (field.columnType && NO_QUOTES_SQL_TYPES.includes(field.columnType.toUpperCase())) {
            return true;
        }

        // 2. Fallback to helpTip parsing
        const match = field.helpTip?.match(REGEX.COLUMN_TYPE_FROM_HELPTIP);
        if (match) {
            const typeFromHelpTip = match[1];
            if (NO_QUOTES_SQL_TYPES.includes(typeFromHelpTip.toUpperCase())) {
                return true;
            }
        }

        // 3. Check if value itself looks numeric or boolean *if* no type info found
        if (!field.columnType && !match && field.value) {
            if (/^\d+(\.\d+)?$/.test(field.value) || /^(true|false)$/i.test(field.value)) {
                // It looks numeric or boolean assume no quotes needed as a guess
                return true;
            }
        }
        return false;
    }

    /** Sets a field value, handling simple strings and expression objects */
    private _setFieldValue(fieldName: string, value: string | number | boolean | null | undefined, isExpression: boolean = false, parentField: string = 'table'): void {
        // Check if the target element expects a simple value or an object
        const targetElement = this.findElementByName(this.formData.elements, getNameForController(fieldName));
        const dynamicField = this.dynamicFields[parentField]?.fields.find((f: DynamicField) => f.value.name === fieldName);
        const expectsObject = targetElement != null ? EXPRESSION_TYPES.includes(targetElement?.inputType) : EXPRESSION_TYPES.includes(dynamicField?.value?.inputType);
        if (expectsObject) {
            this.setValue(getNameForController(fieldName), {
                isExpression: isExpression,
                value: value ?? '',
                namespaces: []
            });
        } else {
            // For simple inputs (text, combo), just set the value
            const finalValue = value ?? '';
            this.setValue(getNameForController(fieldName), finalValue);
        }
    }

    /** Clears a field's value using the appropriate format (simple vs object) */
    private _clearFieldValue(fieldName: string): void {
        const ctrlName = getNameForController(fieldName);
        const fieldElement = this.findElementByName(this.formData.elements, ctrlName);
        if (fieldElement) {
            const expectsObject = fieldElement.inputType && EXPRESSION_TYPES.includes(fieldElement.inputType);
            if (expectsObject) {
                this.setValue(ctrlName, { isExpression: false, value: '', namespaces: [] });
            } else {
                this.setValue(ctrlName, '');
            }
        }
    }

    // --- Query Building Logic ---

    /** Builds the SQL query and prepared statement based on dynamic field values */
    private async _buildQueryFromDynamicFields(
        parentField: string,
        operationType: 'select' | 'insert' | 'delete' | 'call',
        config: OnValueChangeParams,
        element: Element
    ): Promise<void> {
        const connectionInfo = await this._getDbConnectionDetails(); // Get connection for DB type
        const dbType = this._getConnectionDbType(connectionInfo);
        const dynamicFieldValues = this._getDynamicFieldValues(parentField, element, operationType);
        const activeFields = Object.entries(dynamicFieldValues)
            .filter(([, field]) => field.value !== undefined && field.value !== '' && !field.name.endsWith('_include')) // Filter out empty/undefined values
            .reduce((acc, [key, val]) => { acc[key] = val; return acc; }, {} as Record<string, DynamicFieldValue>);
        const selectFields = Object.entries(dynamicFieldValues)
            .filter(([, field]) => field.value !== undefined && field.value !== '' && field.name.endsWith('_include') && field.value.toString() === 'true') // Filter out empty/undefined values
            .reduce((acc, [key, val]) => { acc[key] = val; return acc; }, {} as Record<string, DynamicFieldValue>);
        const allFields = Object.entries(dynamicFieldValues)
            .reduce((acc, [key, val]) => { acc[key] = val; return acc; }, {} as Record<string, DynamicFieldValue>);

        // fill the dynamic fields with the values from the parameters if they are empty
        let queryBuilt = false;
        if (Object.values(dynamicFieldValues).every((field: any) => field.value === "")
            && element.inputType !== 'ParamManager') {

            const resultFieldElement = this.findElementByName(this.formData.elements, getNameForController(config.resultField!));
            const columnTypesElement = this.findElementByName(this.formData.elements, getNameForController(config.columnTypesField!));
            const columnNamesElement = this.findElementByName(this.formData.elements, getNameForController(config.columnNamesField!));
            const preparedStmtElement = this.findElementByName(this.formData.elements, getNameForController(config.preparedResultField!));

            const query = resultFieldElement?.currentValue || '';
            const columnTypes = columnTypesElement?.currentValue;
            const columnNames = columnNamesElement?.currentValue;
            const preparedStatement = preparedStmtElement?.currentValue;

            if (query === undefined && preparedStatement === undefined &&
                columnTypes === undefined && columnNames === undefined) {
                return;
            }

            // Wait for the next tick to allow the UI to update
            await new Promise(resolve => setTimeout(resolve, 0));

            // Populate dynamic fields from parameters if column names are available
            if (columnNames !== undefined && columnTypes !== undefined) {
                const columnNameList = columnNames.split(',').map((name: string) => name.trim());

                columnNameList.forEach((columnName: string) => {
                    const dynamicField = dynamicFieldValues[columnName];
                    if (dynamicField) {
                        const fieldParam = this.parameters?.paramValues.find(
                            (param: any) => param.key === columnName
                        );

                        if (fieldParam?.value) {
                            const fieldValue = fieldParam.value;
                            const isExpression = REGEX.EXPRESSION.test(fieldValue) ||
                                REGEX.SYNAPSE_EXPRESSION.test(fieldValue);

                            // Clean expression format
                            let processedValue = fieldValue;
                            if (isExpression) {
                                processedValue = processedValue.replace(/^\{|\}$/g, "");
                            }
                            this.setValue(dynamicField.name, {
                                isExpression: isExpression,
                                value: processedValue,
                                namespaces: []
                            });
                            queryBuilt = true;
                        }
                    }
                });
            }

            // Set the query fields
            this._setFieldValue(config.resultField!, query);
            this._setFieldValue(config.preparedResultField!, preparedStatement?.replace(/[{}]/g, '') || '', false);
            this._setFieldValue(config.columnTypesField!, columnTypes || '', false);
            this._setFieldValue(config.columnNamesField!, columnNames || '', false);

            // Handle ORDER BY field population for SELECT queries
            if (operationType === QUERY_TYPES.SELECT) {
                const orderByField = this.findElementByName(this.formData.elements, getNameForController(FIELD_NAMES.ORDER_BY));

                // Prevent infinite loop if this is called by the orderBy field itself
                if (orderByField && element.name !== String(orderByField.name) && columnNames && this.setComboValues) {
                    const orderByOptions = columnNames.split(',').map((name: string) => name.trim());
                    this.setComboValues(String(orderByField.name), orderByOptions);
                }
            }
            // Skip the regular query building since restored from existing form values - Form Edit Scenario
            if (!queryBuilt && query !== "" && element.name !== FIELD_NAMES.TABLE_NAME) {
                await this._handleManualQueryChange(query, parentField, operationType, config, element);
                return;
            }
        }

        let query = '';
        let preparedStatement = '';
        const columnNames: string[] = [];
        const columnTypes: string[] = [];

        const tableName = this.getValues(getNameForController(parentField));
        if (!tableName) {
            console.warn("Cannot build query: Table name is missing.");
            return;
        }

        const encodedTableName = this._encodeColumnName(tableName, dbType);

        switch (operationType) {
            case QUERY_TYPES.INSERT:
                const insertColumns = Object.values(activeFields);
                if (insertColumns.length > 0) {
                    const cols = insertColumns.map(f => this._encodeColumnName(f.displayName, dbType)).join(', ');
                    const placeholders = insertColumns.map(() => '?').join(', ');
                    const values = insertColumns.map(f =>
                        this._checkNoQuotesNeeded(f) ? f.value : `'${f.value}'` // Handle expressions and quoting
                    ).join(', ');

                    query = `INSERT INTO ${encodedTableName} (${cols}) VALUES (${values})`;
                    preparedStatement = `INSERT INTO ${encodedTableName} (${cols}) VALUES (${placeholders})`;

                    // push keys of activeFields to columnNames
                    columnNames.push(...Object.keys(activeFields));
                    columnTypes.push(...insertColumns.map(f => f.columnType ?? 'UNKNOWN'));
                } else {
                    query = `INSERT INTO ${encodedTableName} () VALUES ()`; // Or handle as error?
                    preparedStatement = `INSERT INTO ${encodedTableName} () VALUES ()`;
                }

                break;

            case QUERY_TYPES.DELETE:
                query = `DELETE FROM ${encodedTableName}`;
                preparedStatement = `DELETE FROM ${encodedTableName}`;
                if (Object.keys(activeFields).length > 0) {
                    const where = Object.values(activeFields).map(f => {
                        const col = this._encodeColumnName(f.displayName, dbType);
                        const val = this._checkNoQuotesNeeded(f) ? f.value : `'${f.value}'`;
                        return `${col} = ${val}`;
                    }).join(' AND ');
                    const prepWhere = Object.values(activeFields).map(f =>
                        `${this._encodeColumnName(f.displayName, dbType)} = ?`
                    ).join(' AND ');

                    query += ` WHERE ${where}`;
                    preparedStatement += ` WHERE ${prepWhere}`;

                    // push keys of activeFields to columnNames
                    columnNames.push(...Object.keys(activeFields)); // Columns used in WHERE
                    columnTypes.push(...Object.values(activeFields).map(f => f.columnType ?? 'UNKNOWN'));
                }

                break;

            case QUERY_TYPES.SELECT:
                query = `SELECT ${Object.keys(selectFields).length > 0 ? Object.values(selectFields).map(f => f.columnName).join(', ') : '*'} FROM ${encodedTableName}`;
                preparedStatement = `SELECT ${Object.keys(selectFields).length > 0 ? Object.values(selectFields).map(f => f.columnName).join(', ') : '*'} FROM ${encodedTableName}`;

                if (Object.keys(activeFields).length > 0) {
                    const where = Object.values(activeFields).map(f => {
                        const col = this._encodeColumnName(f.displayName, dbType);
                        const val = this._checkNoQuotesNeeded(f) ? f.value : `'${f.value}'`;
                        return `${col} = ${val}`;
                    }).join(' AND ');
                    const prepWhere = Object.values(activeFields).map(f =>
                        `${this._encodeColumnName(f.displayName, dbType)} = ?`
                    ).join(' AND ');

                    query += ` WHERE ${where}`;
                    preparedStatement += ` WHERE ${prepWhere}`;

                    // push keys of activeFields to columnNames
                    columnNames.push(...Object.keys(activeFields));
                    columnTypes.push(...Object.values(activeFields).map(f => f.columnType ?? 'UNKNOWN'));
                }

                // Append ORDER BY, LIMIT, OFFSET for SELECT
                const orderByVal = this.getValues(getNameForController(FIELD_NAMES.ORDER_BY));
                const limitVal = this.getValues(getNameForController(FIELD_NAMES.LIMIT));
                const offsetVal = this.getValues(getNameForController(FIELD_NAMES.OFFSET));

                if (orderByVal) {
                    const encodedOrderBy = this._encodeColumnName(orderByVal, dbType);
                    query += ` ORDER BY ${encodedOrderBy}`;
                    preparedStatement += ` ORDER BY ${encodedOrderBy}`;
                }

                if (limitVal?.value) {
                    query += ` LIMIT ${limitVal.value}`;
                    preparedStatement += ` LIMIT ?`;
                }

                if (offsetVal?.value) {
                    query += ` OFFSET ${offsetVal.value}`;
                    preparedStatement += ` OFFSET ?`;
                }

                break;

            case QUERY_TYPES.CALL:

                let callTemplate;

                // Customize call template based on DB type
                switch (dbType) {
                    case 'oracle':
                        callTemplate = 'BEGIN {0}({1}); END;';
                        break;
                    case 'microsoft sql server':
                        callTemplate = 'EXEC {0} {1}';
                        break;
                    // Default CALL syntax for MySQL and others
                    default:
                        callTemplate = 'CALL {0}({1})';
                        break;
                }

                query = callTemplate.replace('{0}', encodedTableName);
                preparedStatement = query;

                const callParams = Object.values(allFields).map(f => {
                    // if empty return NULL
                    const val = f.value ? (this._checkNoQuotesNeeded(f) ? f.value : `'${f.value}'`) : 'NULL';
                    return `${val}`;
                }).join(', ');

                const prepParams = Object.values(allFields).map(f => '?').join(', ');

                query = query.replace('{1}', callParams);
                preparedStatement = preparedStatement.replace('{1}', prepParams);

                // push keys of activeFields to columnNames
                columnNames.push(...Object.keys(allFields));
                columnTypes.push(...Object.values(allFields).map(f => f.columnType ?? 'UNKNOWN'));

                break;
        }

        // Set the calculated values in the form
        this._setFieldValue(config.resultField!, query);
        this._setFieldValue(config.preparedResultField!, preparedStatement, false); // Prepared statement is never an expression
        this._setFieldValue(config.columnNamesField!, columnNames.join(', '), false);
        this._setFieldValue(config.columnTypesField!, columnTypes.join(', '), false);

    }


    // --- Query Parsing Logic ---

    /** Handles changes to the main query input field, attempting to parse it */
    private async _handleManualQueryChange(
        userQuery: string,
        parentField: string, // The table name field
        operationType: string,
        config: OnValueChangeParams,
        element: Element
    ): Promise<void> {
        let parseSuccess = true;
        let parseErrorMessage = '';

        const queryFieldName = getNameForController(config.resultField!);

        if (!userQuery?.trim()) {
            return;
        }

        const regexMap = {
            [QUERY_TYPES.SELECT]: REGEX.SELECT,
            [QUERY_TYPES.INSERT]: REGEX.INSERT,
            [QUERY_TYPES.DELETE]: REGEX.DELETE,
            [QUERY_TYPES.CALL]: REGEX.CALL,
        };
        const currentRegex = regexMap[operationType];
        const match = currentRegex?.exec(userQuery);

        if (!match?.groups) {
            parseSuccess = false;
            this.setCustomError(queryFieldName, ERROR_MESSAGES.COMPLEX_QUERY);
            // Clear dependent fields
            this._clearFieldValue(config.preparedResultField!);
            this._clearFieldValue(config.columnNamesField!);
            this._clearFieldValue(config.columnTypesField!);
            return;
        }

        this.setCustomError(queryFieldName, null); // Clear previous custom error for query field

        const { tableName, columns, values, whereClause, orderBy, limit, offset } = match.groups;
        const cleanTableName = tableName.replace(/[`'"\[\]]/g, ''); // Remove quotes/brackets
        const parentElement = this.findElementByName(this.formData.elements, parentField);

        // --- Table Validation ---
        const connectionInfo = await this._getValidConnectionDetails();
        // if (!connectionInfo) return;

        const availableTables = connectionInfo ?
            await this._fetchTablesForConnection(connectionInfo, parentElement?.onValueChange?.params?.[0].rpc, element.name as string) : {};
        const availableTableNames = Object.keys(availableTables);

        if (connectionInfo && !availableTableNames.includes(cleanTableName)) {
            this.setCustomError(queryFieldName, ERROR_MESSAGES.TABLE_NOT_FOUND);
            // Clear dependent fields
            this._clearFieldValue(config.preparedResultField!);
            this._clearFieldValue(config.columnNamesField!);
            this._clearFieldValue(config.columnTypesField!);
            return;
        }

        // --- Update Table Field and Potentially Refresh Dynamic Fields ---
        const currentTableValue = this.getValues(getNameForController(parentField));
        if (currentTableValue !== cleanTableName) {
            this.setValue(getNameForController(parentField), cleanTableName);
            // Trigger dynamic field refresh for the new table
            const parentElement = this.findElementByName(this.formData.elements, parentField);
            if (connectionInfo && parentElement) {

                const elementWithType = { ...parentElement, type: '' } as Element;
                await this._handleDynamicContentChange(cleanTableName, parentField, elementWithType);

                // Short delay to allow state updates related to dynamic fields
                await new Promise(resolve => setTimeout(resolve, 50));
            } else {
                console.warn("Could not find parent element definition for:", parentField);
            }
        }

        // --- Parse Clauses and Update Dynamic Fields ---
        // Get the *current* dynamic fields after potential refresh
        const dynamicFieldDefs = this._getDynamicFieldValues(parentField, element);
        const matchedFields: Record<string, DynamicFieldValue> = {}; // Fields found in the query
        const selectMatchedFields: Record<string, DynamicFieldValue> = {}; // Fields found in SELECT clause

        try {
            switch (operationType) {
                case QUERY_TYPES.SELECT:
                    if(columns.trim() !== '*') {
                    const selectResult = this._parseSelectColumns(columns, dynamicFieldDefs, connectionInfo !== undefined);
                    if (!selectResult.success) throw new Error(selectResult.errorMessage || ERROR_MESSAGES.FIELD_NOT_FOUND);
                    Object.assign(selectMatchedFields, selectResult.fields);
                }

                    const whereResult = this._parseWhereClause(whereClause, dynamicFieldDefs, connectionInfo !== undefined);
                    if (!whereResult.success) throw new Error(whereResult.errorMessage || ERROR_MESSAGES.FIELD_NOT_FOUND);
                    Object.assign(matchedFields, whereResult.fields);
                    break;
                case QUERY_TYPES.DELETE:
                    const deleteWhereResult = this._parseWhereClause(whereClause, dynamicFieldDefs, connectionInfo !== undefined);
                    if (!deleteWhereResult.success) throw new Error(deleteWhereResult.errorMessage || ERROR_MESSAGES.FIELD_NOT_FOUND);
                    Object.assign(matchedFields, deleteWhereResult.fields);
                    break;
                case QUERY_TYPES.INSERT:
                    const insertResult = this._parseInsertValues(columns, values, dynamicFieldDefs, connectionInfo !== undefined);
                    if (!insertResult.success) throw new Error(insertResult.errorMessage || ERROR_MESSAGES.INSERT_MISMATCH);
                    Object.assign(matchedFields, insertResult.fields);
                    break;
                case QUERY_TYPES.CALL:
                    const callResult = this._parseCallParams(values, dynamicFieldDefs, connectionInfo !== undefined);
                    if (!callResult.success) throw new Error(callResult.errorMessage || ERROR_MESSAGES.FIELD_NOT_FOUND);
                    Object.assign(matchedFields, callResult.fields);
                    break;
            }

            // --- Update Form Fields based on Parsed Data ---
            // 1. Update dynamic fields found in the query

            if (connectionInfo) {
                Object.values(dynamicFieldDefs).forEach(fieldDef => {
                    // Find if this field is in the matched fields from the query
                    const matched = Object.values(matchedFields).find(m =>
                        fieldDef.displayName === m.displayName ||
                        fieldDef.displayName.replace(/[^a-zA-Z0-9]/g, '') === m.displayName.replace(/[^a-zA-Z0-9]/g, '') ||
                        fieldDef.name === m.name
                    );

                    const selectColMatched = Object.values(selectMatchedFields ?? {}).find(m =>
                        fieldDef.displayName === m.displayName ||
                        fieldDef.displayName.replace(/[^a-zA-Z0-9]/g, '') === m.displayName.replace(/[^a-zA-Z0-9]/g, '') ||
                        fieldDef.name === m.name + '_include'
                    );
                    if (matched) {
                        this._setFieldValue(fieldDef.name, matched.value, matched.isExpression);
                    } else {
                        this._clearFieldValue(fieldDef.name);
                    }
                    if (selectColMatched) {
                        this._setFieldValue(fieldDef.name, true, selectColMatched.isExpression);
                    }
                });
            } else {
                // If connectionInfo is false, set the values to the parameters

                // match matched fields with the param manager values, if found update and if not found add
                let paramManagerTempValues: any[] = [];
                Object.entries(matchedFields).forEach(([key, field]) => {
                    // build the param manager value and add to the array
                    const paramManagerValue = {
                        columnName: key,
                        columnValue: {
                            isExpression: field.isExpression,
                            value: field.value,
                            namespaces: [] as string[]
                        },
                        propertyType: {
                            isExpression: false,
                            value: field.columnType,
                            namespaces: [] as string[]
                        }
                    };

                    paramManagerTempValues.push(paramManagerValue);
                });

                this.setValue(getNameForController(FIELD_NAMES.COLUMNS), paramManagerTempValues);
            }

            // 2. Update common fields (Column Names/Types)
            const columnNames = Object.keys(matchedFields).join(', ');
            const columnTypes = Object.values(matchedFields).map(f => f.columnType ?? 'UNKNOWN').join(', ');
            this._setFieldValue(config.columnNamesField!, columnNames, false);
            this._setFieldValue(config.columnTypesField!, columnTypes, false);

            // 3. Handle optional clauses (SELECT) and clear inapplicable fields
            if (operationType === QUERY_TYPES.SELECT) {
                this._handleOptionalClause(orderBy, FIELD_NAMES.ORDER_BY, false, true);
                this._handleOptionalClause(limit, FIELD_NAMES.LIMIT, true);
                this._handleOptionalClause(offset, FIELD_NAMES.OFFSET, true);
            } else {
                this._clearFieldValue(FIELD_NAMES.ORDER_BY);
                this._clearFieldValue(FIELD_NAMES.LIMIT);
                this._clearFieldValue(FIELD_NAMES.OFFSET);
            }

            // 4. Reconstruct and set the Prepared Statement
            let preparedStatement = '';
            const connectionData = await this._getDbConnectionDetails();
            const dbType = this._getConnectionDbType(connectionData);
            const encodedTableName = this._encodeColumnName(cleanTableName, dbType);

            switch (operationType) {
                case QUERY_TYPES.SELECT:
                    preparedStatement = this._buildSelectPreparedStatement(columns, encodedTableName, matchedFields, orderBy, limit, offset);
                    break;
                case QUERY_TYPES.INSERT:
                    preparedStatement = this._buildInsertPreparedStatement(encodedTableName, matchedFields);
                    break;
                case QUERY_TYPES.DELETE:
                    preparedStatement = this._buildDeletePreparedStatement(encodedTableName, matchedFields);
                    break;
                case QUERY_TYPES.CALL:
                    preparedStatement = this._buildCallPreparedStatement(encodedTableName, matchedFields);
                    break;
            }
            this._setFieldValue(config.preparedResultField!, preparedStatement, false);
            // Clear any previous error message upon successful parsing
            this.setCustomError(queryFieldName, null);

        } catch (error: any) {
            parseErrorMessage = error.message || ERROR_MESSAGES.COMPLEX_QUERY;
            console.warn(`Query parsing error: ${parseErrorMessage}`);
            this.setCustomError(queryFieldName, `Query parsing error: ${parseErrorMessage}`);

            // Clear dependent fields on parse error
            this._clearFieldValue(config.preparedResultField!);
            this._clearFieldValue(config.columnNamesField!);
        }

    }


    /** Helper: Parses WHERE clause conditions */
    private _parseWhereClause(whereClause: string | undefined, availableFields: Record<string, DynamicFieldValue>, connectionInfo: boolean): { success: boolean, fields: Record<string, DynamicFieldValue>, errorMessage?: string } {
        const matchedFields: Record<string, DynamicFieldValue> = {};
        if (!whereClause) {
            return { success: true, fields: matchedFields };
        }

        // conditions within parenthesis are considered out of scope since it introduces unwanted complexicity
        const conditions = whereClause.trim().split(/\s+AND\s+/i);

        for (const condition of conditions) {
            const conditionMatch = condition.match(REGEX.WHERE_CONDITION_PAIR);

            if (!conditionMatch) {
                console.warn(`${ERROR_MESSAGES.PARSE_WHERE_CONDITION}: ${condition}`);
                return { success: false, fields: {}, errorMessage: `${ERROR_MESSAGES.PARSE_WHERE_CONDITION}: "${condition}"` };
            }

            // Extract parts: column, operator, valueStr
            const [, rawColumn, , rawValueStr] = conditionMatch;
            //const columnName = rawColumn.replace(/[^a-zA-Z0-9]/g, '').trim();
            const columnName = rawColumn.trim().replace(/[`'"\[\]]/g, ''); // Remove quotes/brackets

            const valueStr = rawValueStr.trim();

            // if connection info is false build a dummy field
            const dynamicField = connectionInfo ? availableFields[columnName] : {
                name: columnName,
                displayName: columnName,
                value: valueStr,
                isExpression: false,
                columnType: "VARCHAR",
                helpTip: ''
            };

            if (!dynamicField) {
                console.warn(`Dynamic field definition not found for WHERE column: ${columnName}`);
                return { success: false, fields: {}, errorMessage: `Field "${rawColumn}" not found for this table.` };
            }

            // Remove leading/trailing single or double quotes
            const fieldValue = valueStr.replace(/^['"]|['"]$/g, '');

            matchedFields[columnName] = dynamicField;
            matchedFields[columnName].value = fieldValue;
            const isExpression = REGEX.SYNAPSE_EXPRESSION.test(fieldValue);

            matchedFields[columnName] = { ...dynamicField, value: fieldValue, isExpression: isExpression };
        }
        return { success: true, fields: matchedFields };
    }

    /** Helper: Parses INSERT columns and values */
    private _parseInsertValues(columnsStr: string | undefined, valuesStr: string | undefined, availableFields: Record<string, DynamicFieldValue>, connectionInfo: boolean): { success: boolean, fields: Record<string, DynamicFieldValue>, errorMessage?: string } {
        const matchedFields: Record<string, DynamicFieldValue> = {};

        if (!columnsStr || !valuesStr) {
            return { success: false, fields: {}, errorMessage: ERROR_MESSAGES.INSERT_MISMATCH + " (missing columns or values)" };
        }

        // this does not support column names such as  `Random, "``Name,' , .````test`
        // this is an acceptable limitation since this only occurs when user manually enters the query

        const columns = columnsStr.split(',').map(col => col.trim().replace(/[`'"\[\]]/g, ''));
        const values = valuesStr.split(',').map(val => val.trim().replace(/^['"]|['"]$/g, '')); // Remove quotes

        if (columns.length !== values.length || columns.length === 0) {
            console.warn(ERROR_MESSAGES.INSERT_MISMATCH);
            return { success: false, fields: {}, errorMessage: ERROR_MESSAGES.INSERT_MISMATCH };
        }
        for (let i = 0; i < columns.length; i++) {
            const columnName = columns[i];
            const valueStr = values[i];
            const dynamicField = connectionInfo ? availableFields[columnName] : {
                name: columnName,
                displayName: columnName,
                value: valueStr,
                isExpression: false,
                columnType: "VARCHAR",
                helpTip: ''
            };
            if (!dynamicField) {
                console.warn(`Dynamic field definition not found for INSERT column: ${columnName}`);
                return { success: false, fields: {}, errorMessage: `Field "${columnName}" not found for this table.` };
            }

            // Detect if value is expression or literal
            const isSynapseExpr = REGEX.SYNAPSE_EXPRESSION.test(valueStr);
            const isLegacyExpr = REGEX.EXPRESSION.test(valueStr);
            const isExpression = isSynapseExpr || isLegacyExpr;

            matchedFields[columnName] = { ...dynamicField, value: valueStr, isExpression: isExpression };
        }

        return { success: true, fields: matchedFields };
    }

    /** Helper: Parses CALL parameters */
    private _parseCallParams(valuesStr: string | undefined, availableFields: Record<string, DynamicFieldValue>, connectionInfo: boolean): { success: boolean, fields: Record<string, DynamicFieldValue>, errorMessage?: string } {
        const matchedFields: Record<string, DynamicFieldValue> = {};
        if (!valuesStr) {  
            return { success: false, fields: {}, errorMessage: "No parameters provided." };  
        } 
        const values = valuesStr.split(',').map(val => val.trim().replace(/^['"]|['"]$/g, ''));

        // there should be values matching all of the dynamic fields
        // iterate over availbale fields with counter
        if (!connectionInfo) {
            // For offline mode, iterate over values array
            for (let i = 0; i < values.length; i++) {
                const valueStr = values[i];
                const fieldName = `param${i + 1}`;

                const dynamicField = {
                    name: fieldName,
                    displayName: fieldName,
                    value: valueStr,
                    isExpression: false,
                    columnType: "VARCHAR",
                    helpTip: ''
                };

                const isSynapseExpr = REGEX.SYNAPSE_EXPRESSION.test(valueStr);
                const isLegacyExpr = REGEX.EXPRESSION.test(valueStr);
                const isExpression = isSynapseExpr || isLegacyExpr;

                matchedFields[fieldName] = { ...dynamicField, value: valueStr, isExpression: isExpression };
            }
        } else {
            // For online mode, iterate over available fields
            let counter = 0;
            for (const fieldName in availableFields) {
                const dynamicField = availableFields[fieldName];

                if (!dynamicField) {
                    console.warn(`Dynamic field definition not found for CALL column: ${fieldName}`);
                    return { success: false, fields: {}, errorMessage: `Field "${fieldName}" not found for this table.` };
                }

                // Check if value exists for this field
                if (counter >= values.length) {
                    console.warn(`Not enough values provided for CALL parameters.`);
                    return { success: false, fields: {}, errorMessage: `Not enough values provided for CALL parameters.` };
                }

                const valueStr = values[counter];
                const isSynapseExpr = REGEX.SYNAPSE_EXPRESSION.test(valueStr);
                const isLegacyExpr = REGEX.EXPRESSION.test(valueStr);
                const isExpression = isSynapseExpr || isLegacyExpr;

                matchedFields[fieldName] = { ...dynamicField, value: valueStr, isExpression: isExpression };
                counter++;
            }
        }

        return { success: true, fields: matchedFields };
    }
    /** Helper: Parses SELECT columns */
    private _parseSelectColumns(columnsStr: string | undefined, availableFields: Record<string, DynamicFieldValue>, connectionInfo: boolean): { success: boolean, fields: Record<string, DynamicFieldValue>, errorMessage?: string } {
        if (!columnsStr) return { success: false, fields: {}, errorMessage: "No columns specified for SELECT." };
        // Handle SELECT * case
        // if (columnsStr.trim() === '*') {
        //     return { success: true, fields: availableFields };
        // }
        const columns = columnsStr.split(',').map(col => col.trim());
        const matchedFields: Record<string, DynamicFieldValue> = {};
        for (const col of columns) {
            const field = Object.values(availableFields).find(f => f.columnName && f.columnName === col);
            if (!field) {
                console.warn(`No matching field found for column: ${col}`);
                return { success: false, fields: {}, errorMessage: `No matching field found for column: ${col}` };
            }
            matchedFields[col] = field;
        }
        return { success: true, fields: matchedFields };
    }

    /** Helper: Handles optional clauses like ORDER BY, LIMIT, OFFSET during parsing */
    private _handleOptionalClause(clauseValue: string | undefined, fieldName: string, checkExpression: boolean = false, isCombo: boolean = false) {
        
        if (clauseValue) {
            const cleanValue = clauseValue.replace(/[`"\[\]]/g, '');
            const isExpression = checkExpression && REGEX.SYNAPSE_EXPRESSION.test(clauseValue);
            this._setFieldValue(fieldName, cleanValue, isExpression);
        } else {
            this._clearFieldValue(fieldName); // Clear the field if clause not present
        }
    }

    /** Helper: Builds a prepared statement string for SELECT */
    private _buildSelectPreparedStatement(columnsStr: string, tableName: string, matchedWhereFields: Record<string, DynamicFieldValue>, orderBy?: string, limit?: string, offset?: string): string {

        const selectCols = columnsStr?.trim() || '*';
        let statement = `SELECT ${selectCols} FROM ${tableName}`;

        const wherePlaceholders = Object.keys(matchedWhereFields)
            .map(key => `${this._encodeColumnName(matchedWhereFields[key].displayName)} = ?`) // Use displayName for column name
            .join(' AND ');

        if (wherePlaceholders) {
            statement += ` WHERE ${wherePlaceholders}`;
        }

        if (orderBy) {
            const cleanOrderBy = orderBy.replace(/[`"\[\]]/g, '').trim();
            statement += ` ORDER BY ${cleanOrderBy}`;
        }

        if (limit) { statement += ` LIMIT ?`; }
        if (offset) { statement += ` OFFSET ?`; }

        return statement;
    }

    /** Helper: Builds a prepared statement string for INSERT */
    private _buildInsertPreparedStatement(tableName: string, matchedFields: Record<string, DynamicFieldValue>): string {
        const columns = Object.values(matchedFields).map(f => this._encodeColumnName(f.displayName)).join(', ');
        const placeholders = Object.keys(matchedFields).map(() => '?').join(', ');
        if (!columns) return `INSERT INTO ${tableName} DEFAULT VALUES`; // Handle case with no columns
        return `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    }

    /** Helper: Builds a prepared statement string for DELETE */
    private _buildDeletePreparedStatement(tableName: string, matchedWhereFields: Record<string, DynamicFieldValue>): string {
        let statement = `DELETE FROM ${tableName}`; // tableName should be encoded already

        const wherePlaceholders = Object.keys(matchedWhereFields)
            .map(key => `${this._encodeColumnName(matchedWhereFields[key].displayName)} = ?`)
            .join(' AND ');

        if (wherePlaceholders) {
            statement += ` WHERE ${wherePlaceholders}`;
        }
        // Allow DELETE without WHERE

        return statement;
    }

    /** Helper: Builds a prepared statement string for CALL */
    private _buildCallPreparedStatement(tableName: string, matchedFields: Record<string, DynamicFieldValue>): string {
        const placeholders = Object.keys(matchedFields).map(() => '?').join(', ');
        return `CALL ${tableName}(${placeholders})`;
    }

    private async _handleAssistanceModeChange(value: any, fieldName: string, rpc?: string): Promise<void> {
        if (value === true) {
            this.setValue(FIELD_NAMES.QUERY_TYPE, UI_MODES.ONLINE);
            this.onConnectionChange(fieldName, rpc)
        } else {
            this.setValue(FIELD_NAMES.QUERY_TYPE, UI_MODES.OFFLINE);
            this.setCustomError(getNameForController(FIELD_NAMES.CONFIG_KEY), null);
            this._updateUiForConnectionState(false, [fieldName], {}); // Offline state
        }
    }
}
