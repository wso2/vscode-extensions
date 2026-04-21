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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, SearchBox, TreeView } from '@wso2/ui-toolkit';
import { TestCollection, TestRequest } from '@wso2/api-designer-core';
import { getMethodColor } from '../../../utils/formUtils';
import { CreateCollectionDialog } from './CreateCollectionDialog';
import { CreateTestDialog } from './CreateTestDialog';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';

interface SidebarContainerProps {
    width: number;
}

const SidebarContainer = styled.div<SidebarContainerProps>`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--vscode-editor-background);
    border-right: 1px solid var(--vscode-panel-border);
    width: ${(props: SidebarContainerProps) => props.width}px;
    min-width: 200px;
    max-width: 600px;
    flex-shrink: 0;
    position: relative;
`;

const ResizeHandle = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
    z-index: 10;
    
    &:hover {
        background: var(--vscode-sash-hoverBorder);
    }
    
    &:active {
        background: var(--vscode-sash-activeBorder);
    }
`;

const SidebarHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    gap: 8px;
`;

const SidebarTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    flex: 1;
`;

const SearchContainer = styled.div`
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const CollectionsContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0;
`;

interface CollectionItemProps {
    isSelected: boolean;
}

const ActionButtons = styled.div`
    display: flex;
    gap: 4px;
    margin-left: auto;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s ease;
`;

const CollectionItem = styled.div<CollectionItemProps>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    height: 22px;
    cursor: pointer;
    background: ${(props: CollectionItemProps) => props.isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'};
    color: ${(props: CollectionItemProps) => props.isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)'};
    min-width: 0;
    flex: 1;
    
    &:hover {
        background: ${(props: CollectionItemProps) => props.isSelected 
            ? 'var(--vscode-list-activeSelectionBackground)' 
            : 'var(--vscode-list-hoverBackground)'};
        
        .action-buttons {
            opacity: 1;
        }
    }
    
    button {
        position: relative;
        z-index: 10;
    }
`;

const CollectionName = styled.span`
    flex: 0 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    max-width: 200px;
`;

interface TestItemProps {
    isSelected: boolean;
}

const TestItem = styled.div<TestItemProps>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px 0 20px;
    height: 22px;
    cursor: pointer;
    background: ${(props: TestItemProps) => props.isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'};
    color: ${(props: TestItemProps) => props.isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)'};
    font-size: 12px;
    
    &:hover {
        background: ${(props: TestItemProps) => props.isSelected 
            ? 'var(--vscode-list-activeSelectionBackground)' 
            : 'var(--vscode-list-hoverBackground)'};
        
        .action-buttons {
            opacity: 1;
        }
    }
`;

const MethodBadge = styled.span<{ method: string }>`
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    min-width: 45px;
    text-align: center;
    color: ${(props: { method: string }) => getMethodColor(props.method)};
    flex-shrink: 0;
`;

const TestName = styled.span`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const EmptyState = styled.div`
    padding: 32px 0;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const TextContainer = styled.div`
    padding: 0 16px;
    margin-bottom: 16px;
`;

const QuickActionsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding: 0 16px;
    box-sizing: border-box;
`;

const QuickActionCard = styled.div`
    padding: 12px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
    }
`;

const QuickActionIcon = styled.div`
    color: var(--vscode-textLink-foreground);
    margin-top: 2px;
`;

const QuickActionContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const QuickActionTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const QuickActionDescription = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const HeaderActions = styled.div`
    display: flex;
    gap: 4px;
`;

const EmptyTitle = styled.div`
    font-weight: 600;
    font-size: 14px;
    color: var(--vscode-foreground);
    margin-bottom: 4px;
`;

const EmptyDescription = styled.div`
    font-size: 12px;
    line-height: 1.4;
`;

const CollectionCount = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
`;

interface CollectionSidebarProps {
    collections: TestCollection[];
    selectedCollectionId?: string;
    selectedTestId?: string;
    onSelectCollection: (collectionId: string) => void;
    onSelectTest: (testId: string) => void;
    onCreateCollection: (name: string, description?: string, generationType?: 'none' | 'unit' | 'ai-unit' | 'ai-integration', customInstructions?: string, generatedTests?: TestRequest[]) => Promise<void>;
    onDeleteCollection: (collectionId: string) => Promise<void>;
    onAddTest: (collectionId: string, test: TestRequest) => Promise<void>;
    onDeleteTest: (collectionId: string, testId: string) => Promise<void>;
    onImportPostman: () => Promise<void>;
    onExportPostman: (collection: TestCollection) => Promise<void>;
    fileUri: string;
    specType?: 'openapi' | 'asyncapi';
    apiTitle?: string;
}

export const CollectionSidebar: React.FC<CollectionSidebarProps> = ({
    collections,
    selectedCollectionId,
    selectedTestId,
    onSelectCollection,
    onSelectTest,
    onCreateCollection,
    onDeleteCollection,
    onAddTest,
    onDeleteTest,
    onImportPostman,
    onExportPostman,
    fileUri,
    specType,
    apiTitle,
}) => {
    const { rpcClient } = useVisualizerContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
    const [showCreateCollectionDialog, setShowCreateCollectionDialog] = useState(false);
    const [initialGenerationType, setInitialGenerationType] = useState<'none' | 'unit' | 'ai-unit' | 'ai-integration'>('none');
    const [showCreateTestDialog, setShowCreateTestDialog] = useState(false);
    const [testCollectionId, setTestCollectionId] = useState<string | null>(null);
    const [sidebarWidth, setSidebarWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);

    const toggleCollection = (collectionId: string) => {
        setExpandedCollections(prev => {
            const next = new Set(prev);
            if (next.has(collectionId)) {
                next.delete(collectionId);
            } else {
                next.add(collectionId);
            }
            return next;
        });
    };

    const handleCreateTest = (collectionId: string) => {
        setTestCollectionId(collectionId);
        setShowCreateTestDialog(true);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 600) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing]);

    const handleCreateCollection = async () => {
        setInitialGenerationType('none');
        setShowCreateCollectionDialog(true);
    };

    const filteredCollections = collections.filter(collection => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return collection.name.toLowerCase().includes(searchLower) ||
            collection.requests.some(req => 
                req.name.toLowerCase().includes(searchLower) ||
                req.path.toLowerCase().includes(searchLower)
            );
    });

    const handleQuickAction = (type: 'none' | 'unit' | 'ai-unit' | 'ai-integration') => {
        setInitialGenerationType(type);
        setShowCreateCollectionDialog(true);
    };

    return (
        <>
            <SidebarContainer width={sidebarWidth}>
                <ResizeHandle onMouseDown={handleMouseDown} />
            <SidebarHeader>
                <SidebarTitle>Collections</SidebarTitle>
                <HeaderActions>
                    <Button
                        appearance="icon"
                        onClick={onImportPostman}
                        tooltip="Import Postman Collection"
                    >
                        <Codicon name="cloud-download" />
                    </Button>
                    <Button
                        appearance="icon"
                        onClick={handleCreateCollection}
                        aria-label="Create Collection"
                        tooltip="Create New Collection"
                    >
                        <Codicon name="add" />
                    </Button>
                </HeaderActions>
            </SidebarHeader>
            <SearchContainer>
                <SearchBox
                    placeholder="Search collections..."
                    value={searchTerm}
                    onChange={(value: string) => setSearchTerm(value)}
                />
            </SearchContainer>
            <CollectionsContainer>
                {filteredCollections.length === 0 ? (
                    <EmptyState>
                        {collections.length === 0 ? (
                            <>
                                <TextContainer>
                                    <EmptyTitle>
                                        No Test Collections
                                    </EmptyTitle>
                                    <EmptyDescription>
                                        Create a collection to start testing your API endpoints.
                                    </EmptyDescription>
                                </TextContainer>
                                
                                <QuickActionsContainer>
                                    <QuickActionCard onClick={() => handleQuickAction('unit')}>
                                        <QuickActionIcon>
                                            <Codicon name="file-code" sx={{ fontSize: '18px' }} />
                                        </QuickActionIcon>
                                        <QuickActionContent>
                                            <QuickActionTitle>Generate Unit Tests</QuickActionTitle>
                                            <QuickActionDescription>Auto-generate tests from your API specification.</QuickActionDescription>
                                        </QuickActionContent>
                                    </QuickActionCard>

                                    <QuickActionCard onClick={() => handleQuickAction('ai-unit')}>
                                        <QuickActionIcon>
                                            <Codicon name="sparkle" sx={{ fontSize: '18px' }} />
                                        </QuickActionIcon>
                                        <QuickActionContent>
                                            <QuickActionTitle>Generate Unit Tests with AI</QuickActionTitle>
                                            <QuickActionDescription>Generate comprehensive tests with AI assistance.</QuickActionDescription>
                                        </QuickActionContent>
                                    </QuickActionCard>

                                    <QuickActionCard onClick={() => handleQuickAction('ai-integration')}>
                                        <QuickActionIcon>
                                            <Codicon name="sparkle" sx={{ fontSize: '18px' }} />
                                        </QuickActionIcon>
                                        <QuickActionContent>
                                            <QuickActionTitle>Generate Integration Tests with AI</QuickActionTitle>
                                            <QuickActionDescription>Use AI to build end-to-end workflow tests.</QuickActionDescription>
                                        </QuickActionContent>
                                    </QuickActionCard>

                                    <QuickActionCard onClick={onImportPostman}>
                                        <QuickActionIcon>
                                            <Codicon name="cloud-download" sx={{ fontSize: '18px' }} />
                                        </QuickActionIcon>
                                        <QuickActionContent>
                                            <QuickActionTitle>Import Postman Collection</QuickActionTitle>
                                            <QuickActionDescription>Import an existing collection from Postman format.</QuickActionDescription>
                                        </QuickActionContent>
                                    </QuickActionCard>

                                    <QuickActionCard onClick={() => handleQuickAction('none')}>
                                        <QuickActionIcon>
                                            <Codicon name="add" sx={{ fontSize: '18px' }} />
                                        </QuickActionIcon>
                                        <QuickActionContent>
                                            <QuickActionTitle>New Empty Collection</QuickActionTitle>
                                            <QuickActionDescription>Start with a clean slate and add tests manually.</QuickActionDescription>
                                        </QuickActionContent>
                                    </QuickActionCard>
                                </QuickActionsContainer>
                            </>
                        ) : (
                            <TextContainer>
                                <div>No collections match your search</div>
                            </TextContainer>
                        )}
                    </EmptyState>
                ) : (
                    filteredCollections.map(collection => {
                        const isExpanded = expandedCollections.has(collection.id);
                        const isSelected = selectedCollectionId === collection.id && !selectedTestId;
                        const filteredTests = collection.requests.filter(test => {
                            if (!searchTerm) return true;
                            const searchLower = searchTerm.toLowerCase();
                            return test.name.toLowerCase().includes(searchLower) ||
                                test.path.toLowerCase().includes(searchLower);
                        });

                        return (
                            <TreeView
                                key={collection.id}
                                id={collection.id}
                                rootTreeView={false}
                                expandByDefault={isExpanded}
                                onSelect={() => toggleCollection(collection.id)}
                                selectedId={isSelected ? collection.id : undefined}
                                sx={{ paddingLeft: '4px' }}
                                content={
                                    <CollectionItem
                                        isSelected={isSelected}
                                        onClick={(e) => {
                                            // Don't select if clicking on buttons
                                            if ((e.target as HTMLElement).closest('button')) {
                                                return;
                                            }
                                            e.stopPropagation();
                                            onSelectCollection(collection.id);
                                            if (!isExpanded) {
                                                toggleCollection(collection.id);
                                            }
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            // TODO: Show context menu for delete
                                        }}
                                    >
                                        <Codicon name="folder" />
                                        <CollectionName>{collection.name}</CollectionName>
                                        <CollectionCount>
                                            ({collection.requests.length})
                                        </CollectionCount>
                                        <ActionButtons className="action-buttons">
                                            <Button
                                                appearance="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    onExportPostman(collection);
                                                }}
                                                tooltip="Export to Postman"
                                            >
                                                <Codicon name="cloud-upload" />
                                            </Button>
                                            <Button
                                                appearance="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleCreateTest(collection.id);
                                                }}
                                                aria-label="Add Test"
                                                tooltip="Add New Test"
                                            >
                                                <Codicon name="add" />
                                            </Button>
                                            <Button
                                                appearance="icon"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    
                                                    if (!rpcClient) return;
                                                    
                                                    const confirmed = await rpcClient.showConfirmMessage({
                                                        message: `Are you sure you want to delete "${collection.name}"?\n\nThis will delete the collection file.`,
                                                        buttonText: 'Delete'
                                                    });
                                                    
                                                    if (confirmed) {
                                                        try {
                                                            await onDeleteCollection(collection.id);
                                                        } catch (error) {
                                                            console.error('Failed to delete collection:', error);
                                                        }
                                                    }
                                                }}
                                                aria-label="Delete Collection"
                                                tooltip="Delete Collection"
                                            >
                                                <Codicon name="trash" />
                                            </Button>
                                        </ActionButtons>
                                    </CollectionItem>
                                }
                            >
                                {isExpanded && filteredTests.map(test => (
                                    <div key={test.id}>
                                        <TestItem
                                            isSelected={selectedTestId === test.id}
                                            onClick={() => {
                                                onSelectCollection(collection.id);
                                                onSelectTest(test.id);
                                            }}
                                        >
                                            <MethodBadge method={test.method}>{test.method}</MethodBadge>
                                            <TestName>{test.name}</TestName>
                                            <ActionButtons className="action-buttons">
                                                <Button
                                                    appearance="icon"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        
                                                        if (!rpcClient) return;
                                                        
                                                        const confirmed = await rpcClient.showConfirmMessage({
                                                            message: `Are you sure you want to delete "${test.name}"?\n\nThis action cannot be undone.`,
                                                            buttonText: 'Delete'
                                                        });
                                                        
                                                        if (confirmed) {
                                                            try {
                                                                await onDeleteTest(collection.id, test.id);
                                                            } catch (error) {
                                                                console.error('Failed to delete test:', error);
                                                            }
                                                        }
                                                    }}
                                                    aria-label="Delete Test"
                                                >
                                                    <Codicon name="trash" />
                                                </Button>
                                            </ActionButtons>
                                        </TestItem>
                                    </div>
                                ))}
                            </TreeView>
                        );
                    })
                )}
            </CollectionsContainer>
            </SidebarContainer>
            <CreateCollectionDialog
                isOpen={showCreateCollectionDialog}
                onClose={() => setShowCreateCollectionDialog(false)}
                onCreate={async (name, description, generationType, customInstructions, generatedTests) => {
                    await onCreateCollection(name, description, generationType, customInstructions, generatedTests);
                }}
                fileUri={fileUri}
                specType={specType}
                apiTitle={apiTitle}
                initialGenerationType={initialGenerationType}
            />
            <CreateTestDialog
                isOpen={showCreateTestDialog && !!testCollectionId}
                collectionId={testCollectionId || ''}
                onClose={() => {
                    setShowCreateTestDialog(false);
                    setTestCollectionId(null);
                }}
                onCreate={async (test) => {
                    if (testCollectionId) {
                        await onAddTest(testCollectionId, test);
                    }
                }}
            />
        </>
    );
};

