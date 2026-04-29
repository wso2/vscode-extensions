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

import { useEffect, useState } from 'react';
import { Alert, Button, Codicon, Drawer, Dropdown, OptionProps, Typography } from '@wso2/ui-toolkit';
import * as yup from 'yup';
import styled from '@emotion/styled';
import { DATASOURCE, SIDE_PANEL_WIDTH } from '../../../../constants';
import { Controller, Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Table } from '../../../../components/Table';

const Container = styled.div`
    * {
        box-sizing: border-box;
    }
`;

const ActionContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 10px;
    padding-bottom: 20px;
`;

const SidePanelTitleContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    font: inherit;
    font-weight: bold;
    color: var(--vscode-editor-foreground);
`;

const SidePanelBody = styled.div`
    width: 450px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: scroll;
`;

const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--vscode-editor-foreground);
`;

const table = yup.object({
    name: yup.string().required(),
    methods: yup
        .object({
            get: yup.boolean(),
            post: yup.boolean(),
            put: yup.boolean(),
            delete: yup.boolean(),
        }),
});

const schema = yup.object({
    datasource: yup.string().required(),
    tables: yup.array(table)
        .test('tables', 'At least one table should available', (value) => value.length > 0)
        .test(
            'at-least-one-method',
            'At least one method must be selected in one of the tables',
            (tables) =>
                Array.isArray(tables) &&
                tables.some((table) =>
                    table.methods && Object.values(table.methods).some((method) => method === true)
                )
        ),
});

type GenerateResourceFields = yup.InferType<typeof schema>;

type DataSource = {
    id: string;
    className: string;
    dbUrl: string;
    name: string;
    password: string;
};

const initialValues: GenerateResourceFields = {
    datasource: '',
    tables: [],
};

type GenerateResourceProps = {
    isOpen: boolean;
    documentUri: string;
    syntaxTree: any;
    onCancel: () => void;
};

type TableDataType = {
    [tableName: string]: string;
};

export const GenerateResourceForm = ({ isOpen, documentUri, syntaxTree, onCancel }: GenerateResourceProps) => {
    const { rpcClient } = useVisualizerContext();

    const {
        control,
        watch,
        handleSubmit,
        formState: { isValid },
        setValue,
        reset,
    } = useForm<GenerateResourceFields, any, GenerateResourceFields>({
        defaultValues: initialValues,
        resolver: yupResolver(schema) as Resolver<GenerateResourceFields,any,GenerateResourceFields
  >,
        mode: 'onChange',
    });

    const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
    const [datasources, setDatasources] = useState<DataSource[]>([]);
    const [items, setItems] = useState<OptionProps[]>([]);
    const [isError, setIsError] = useState<boolean>(false);

    const resetValues = () => {
        reset();
        setDatasources([]);
        setItems([]);
        setIsError(false);
        setSelectedPageIndex(0);
    };

    const handleFetchTables = async (datasources: DataSource[]) => {
        const datasourceId = watch('datasource');
        const datasource = datasources.find((ds: DataSource) => ds.id === datasourceId);

        const { success } = await rpcClient.getMiDiagramRpcClient().testDbConnection({
            url: datasource.dbUrl,
            className: datasource.className,
            username: datasource.name,
            password: datasource.password,
            dbName: '',
            dbType: '',
            host: '',
            port: '',
        });

        if (!success) {
            setIsError(true);
            throw new Error('Failed to establish database connection.');
        }

        const fetchedTables = await rpcClient.getMiDiagramRpcClient().fetchDSSTables({
            className: datasource.className,
            username: datasource.name,
            password: datasource.password,
            url: datasource.dbUrl,
        });

        const tableData = Object.keys(fetchedTables).map((tableName, index) => {
            const readonly = fetchedTables[tableName]![0];
            const primaryKey = fetchedTables[tableName]![1];

            return {
                id: `tables[${index}].methods`,
                name: tableName,
                get: false,
                post: !readonly ? false : undefined,
                put: !readonly && primaryKey ? false : undefined,
                delete: !readonly && primaryKey ? false : undefined,
            };
        });

        setValue('tables', tableData, { shouldValidate: true });
        setSelectedPageIndex(1);
    };

    const handleCancel = () => {
        if (datasources.length > 1 && selectedPageIndex === 1) {
            setSelectedPageIndex(0);
        } else if (datasources.length > 1 && isError) {
            setIsError(false);
        } else {
            resetValues();
            onCancel();
        }
    };

    const handleGenerate = async (values: GenerateResourceFields) => {
        const tableData: TableDataType = {};
        for (const table of values.tables) {
            const methods = table.methods;
            tableData[table.name] = `${methods.get ? 'GET' : ''},${methods.post ? 'POST' : ''},${
                methods.put ? 'PUT' : ''
            },${methods.delete ? 'DELETE' : ''}`;
        }

        const datasource = datasources.find((ds: DataSource) => ds.id === values.datasource);
        const generateResourceParams = {
            documentUri,
            position: syntaxTree.data.spaces.endingTagSpace.leadingSpace.range.start,
            className: datasource.className,
            url: datasource.dbUrl,
            username: datasource.name,
            password: datasource.password,
            datasourceName: datasource.id,
            tableData: JSON.stringify(tableData),
        };

        await rpcClient.getMiDiagramRpcClient().generateDSSQueries(generateResourceParams);

        onCancel();
    };

    useEffect(() => {
        if (!isOpen) {
            resetValues();
            return;
        }

        const fetchData = async () => {
            try {
                const fetchedData = syntaxTree.data.configs;
                if (fetchedData?.length > 0) {
                    const datasourceInfo: DataSource[] = [];
                    for (const item of fetchedData) {
                        const datasource = { id: item.id, className: '', dbUrl: '', name: '', password: '' };

                        if (item.property.some((property: any) => property.name === DATASOURCE.TYPE.RDBMS)) {
                            for (const property of item.property) {
                                if (property.name === DATASOURCE.PROPERTY.CLASS_NAME) {
                                    datasource.className = property.textNode;
                                } else if (property.name === DATASOURCE.PROPERTY.DB_URL) {
                                    datasource.dbUrl = property.textNode;
                                } else if (property.name === DATASOURCE.PROPERTY.USERNAME) {
                                    datasource.name = property.textNode;
                                } else if (property.name === DATASOURCE.PROPERTY.PASSWORD) {
                                    datasource.password = property.textNode;
                                }
                            }
                        } else if (
                            item.property.some((property: any) => property.name === DATASOURCE.TYPE.CARBON_DATASOURCE)
                        ) {
                            const property = item.property.find(
                                (property: any) => property.name === DATASOURCE.TYPE.CARBON_DATASOURCE
                            );
                            const artifactName = property.textNode;
                            const datasourceST = await rpcClient.getMiDiagramRpcClient().getSyntaxTree({
                                artifactType: 'data-sources',
                                artifactName: `${artifactName}.xml`,
                            });

                            if (!datasourceST) {
                                throw new Error('Failed to fetch datasource');
                            }

                            const properties = datasourceST.syntaxTree.datasource.definition.configuration.content;

                            // Check if the datasource is a RDBMS datasource
                            if (!properties.some((property: any) => property.tag === DATASOURCE.TYPE.RDBMS)) {
                                continue;
                            }

                            for (const property of properties) {
                                if (property.tag === DATASOURCE.PROPERTY.CLASS_NAME) {
                                    datasource.className = property.textNode;
                                } else if (property.tag === DATASOURCE.PROPERTY.DB_URL) {
                                    datasource.dbUrl = property.textNode;
                                } else if (property.tag === DATASOURCE.PROPERTY.USERNAME) {
                                    datasource.name = property.textNode;
                                } else if (property.tag === DATASOURCE.PROPERTY.PASSWORD) {
                                    datasource.password = property.textNode;
                                }
                            }
                        } else {
                            continue;
                        }

                        datasourceInfo.push(datasource);
                    }

                    const datasourceItems = datasourceInfo.map((datasource) => ({
                        id: datasource.id,
                        value: datasource.id,
                        label: datasource.id,
                    }));

                    setValue('datasource', datasourceItems[0].value, { shouldValidate: true });

                    if (datasourceItems.length === 1) {
                        await handleFetchTables(datasourceInfo);
                    }

                    setDatasources(datasourceInfo);
                    setItems(datasourceItems);
                } else {
                    resetValues();
                }
            } catch (error: any) {
                console.error(error);
            }
        };

        fetchData();
    }, [isOpen]);

    return (
        <Container>
            <Drawer
                isOpen={isOpen && datasources.length > 1}
                isSelected={isOpen && datasources.length > 1}
                width={SIDE_PANEL_WIDTH}
                sx={{ transition: 'all 0.3s ease-in-out' }}
            >
                <SidePanelTitleContainer>
                    <Typography variant="h3" sx={{margin: 0}}>Generate Resources</Typography>
                    <Button sx={{ marginLeft: 'auto' }} onClick={handleCancel} appearance="icon">
                        <Codicon name="close" />
                    </Button>
                </SidePanelTitleContainer>
                <SidePanelBody>
                    <Controller
                        name="datasource"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                            <Dropdown
                                id="datasource"
                                label="Datasource"
                                items={items}
                                value={value}
                                onValueChange={onChange}
                            />
                        )}
                    />
                    <ActionContainer>
                        <Button appearance="primary" onClick={() => handleFetchTables(datasources)}>
                            Fetch Tables
                        </Button>
                        <Button appearance="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </ActionContainer>
                </SidePanelBody>
            </Drawer>
            <Drawer
                isOpen={isOpen && selectedPageIndex === 1}
                isSelected={isOpen && selectedPageIndex === 1}
                width={SIDE_PANEL_WIDTH}
                sx={{ transition: 'all 0.3s ease-in-out' }}
            >
                <SidePanelTitleContainer>
                    <Button sx={{ marginLeft: 'auto' }} onClick={handleCancel} appearance="icon">
                        <Codicon name="close" />
                    </Button>
                </SidePanelTitleContainer>
                <SidePanelBody>
                    <Typography variant="h3">Generate Resources</Typography>
                    <Typography variant="h4" sx={{ margin: 0 }}>
                        Select Tables
                    </Typography>
                    <Table control={control} name="tables" />
                    <ActionContainer>
                        <Button appearance="primary" onClick={handleSubmit(handleGenerate)} disabled={!isValid}>
                            Generate
                        </Button>
                        <Button appearance="secondary" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </ActionContainer>
                </SidePanelBody>
            </Drawer>
            <Drawer
                isOpen={isOpen && isError}
                isSelected={isOpen && isError}
                width={SIDE_PANEL_WIDTH}
                sx={{ transition: 'all 0.3s ease-in-out' }}
            >
                <SidePanelTitleContainer>
                    <Button sx={{ marginLeft: 'auto' }} onClick={onCancel} appearance="icon">
                        <Codicon name="close" />
                    </Button>
                </SidePanelTitleContainer>
                <SidePanelBody>
                    <Typography variant="h3">Generate Resources</Typography>
                    <Alert title="Error!" variant="error">
                        A RDBMS datasource is required with the relevant driver added to it in order to use this
                        feature.
                    </Alert>
                    <ActionContainer>
                        <Button appearance="primary" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </ActionContainer>
                </SidePanelBody>
            </Drawer>
        </Container>
    );
};
