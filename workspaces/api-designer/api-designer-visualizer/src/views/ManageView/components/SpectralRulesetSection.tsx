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

import React from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, TextField } from '@wso2/ui-toolkit';
import { SpectralRuleset } from '@wso2/api-designer-core';
import { FormField, FormGrid } from '../../../components/forms';

const CollapsibleHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 8px 0;
    user-select: none;
    
    &:hover {
        opacity: 0.8;
    }
`;

const CollapsibleContent = styled.div<{ isOpen: boolean }>`
    display: ${(props: { isOpen: boolean }) => (props.isOpen ? 'flex' : 'none')};
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
`;

const SubsectionContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-left: 24px;
    margin-top: 8px;
`;

const InfoText = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
`;

const ErrorMessage = styled.div`
    font-size: 12px;
    color: var(--vscode-errorForeground);
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    padding: 8px 12px;
    margin-top: 8px;
    line-height: 1.4;
`;

const RulesetList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FolderGroupHeader = styled.div`
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: var(--vscode-editor-background);
    border-left: 3px solid var(--vscode-textLink-foreground);
    margin-bottom: 8px;
    margin-top: 16px;
    border-radius: 4px;
    font-size: 13px;
    color: var(--vscode-foreground);

    &:first-child {
        margin-top: 0;
    }
`;

const RulesetItem = styled.div`
    display: flex;
    flex-direction: column;
    padding: 12px 16px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    font-size: 13px;
    color: var(--vscode-foreground);
    gap: 12px;
`;

const RulesetHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const RulesetInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
`;

const RulesetName = styled.span`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
`;

const RulesetActions = styled.div`
    display: flex;
    gap: 8px;
`;

const RulesetDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const RulesetEditForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
`;

const AddRulesetForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    margin-top: 8px;
`;

const FormRow = styled.div`
    display: flex;
    gap: 12px;
    align-items: flex-end;
`;

const FormRowSpaced = styled(FormRow)`
    margin-top: 12px;
`;

const CollapsibleTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const FolderGroupTitle = styled.span`
    margin-left: 8px;
    font-weight: 500;
`;

const FolderGroupCount = styled.span`
    margin-left: 8px;
    opacity: 0.7;
    font-size: 12px;
`;

const FetchedRulesetsIntro = styled(InfoText)`
    margin-top: 16px;
    margin-bottom: 8px;
`;

const InputWithButton = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
`;

const FilePickerButton = styled.button`
    position: absolute;
    right: 8px;
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.15s ease;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }
`;

const Label = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
`;

const CollapsibleSectionLabel = styled(Label)`
    margin: 0;
    cursor: pointer;
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FlexFormGroup = styled(FormGroup)`
    flex: 1;
`;

export interface SpectralRulesetSectionProps {
    rulesets: SpectralRuleset[];
    isExpanded: boolean;
    isAdding: boolean;
    editingIndex: number | null;
    newRulesetFolderPath: string;
    fetchedRulesets: any[];
    isLoadingRulesets: boolean;
    rulesetError: string | null;
    editRulesetName: string;
    editRulesetSourceFolder: string;
    editRulesetFileName: string;
    editRulesetContentPath: string;
    onToggleExpand: () => void;
    onStartAdding: () => void;
    onCancelAdding: () => void;
    onFolderPathChange: (path: string) => void;
    onBrowseFolder: () => void;
    onFetchRulesets: () => void;
    onAddFetchedRulesets: () => void;
    onStartEdit: (index: number) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onRemove: (index: number) => void;
    onEditNameChange: (name: string) => void;
    onEditSourceFolderChange: (folder: string) => void;
    onEditFileNameChange: (fileName: string) => void;
    onEditContentPathChange: (path: string) => void;
}

export const SpectralRulesetSection: React.FC<SpectralRulesetSectionProps> = ({
    rulesets,
    isExpanded,
    isAdding,
    editingIndex,
    newRulesetFolderPath,
    fetchedRulesets,
    isLoadingRulesets,
    rulesetError,
    editRulesetName,
    editRulesetSourceFolder,
    editRulesetFileName,
    editRulesetContentPath,
    onToggleExpand,
    onStartAdding,
    onCancelAdding,
    onFolderPathChange,
    onBrowseFolder,
    onFetchRulesets,
    onAddFetchedRulesets,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onRemove,
    onEditNameChange,
    onEditSourceFolderChange,
    onEditFileNameChange,
    onEditContentPathChange
}) => {
    // Group rulesets by source folder
    const grouped = rulesets.reduce<Record<string, Array<{ ruleset: SpectralRuleset; originalIndex: number }>>>((acc, ruleset, index) => {
        const folder = ruleset.sourceFolder;
        if (!acc[folder]) {
            acc[folder] = [];
        }
        acc[folder].push({ ruleset, originalIndex: index });
        return acc;
    }, {});

    return (
        <FormGroup>
            <CollapsibleHeader onClick={onToggleExpand}>
                <CollapsibleTitleRow>
                    <Codicon 
                        name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                        sx={{ fontSize: '16px' }} 
                    />
                    <CollapsibleSectionLabel>Governance Rulesets</CollapsibleSectionLabel>
                </CollapsibleTitleRow>
                <InfoText>
                    {rulesets.length} configured
                </InfoText>
            </CollapsibleHeader>
            
            <CollapsibleContent isOpen={isExpanded}>
                <SubsectionContent>
                    <InfoText>Spectral rulesets configured for this project</InfoText>
                    <RulesetList>
                        {rulesets.length > 0 ? (
                            Object.entries(grouped).map(([folder, items]) => (
                                <div key={folder}>
                                    <FolderGroupHeader>
                                        <Codicon name="folder" sx={{ fontSize: '14px' }} />
                                        <FolderGroupTitle>{folder}</FolderGroupTitle>
                                        <FolderGroupCount>
                                            ({items.length} ruleset{items.length !== 1 ? 's' : ''})
                                        </FolderGroupCount>
                                    </FolderGroupHeader>
                                    {items.map(({ ruleset, originalIndex }) => (
                                        <RulesetItem key={originalIndex}>
                                            {editingIndex === originalIndex ? (
                                                <>
                                                    <RulesetHeader>
                                                        <RulesetInfo>
                                                            <Codicon name="shield" sx={{ fontSize: '14px' }} />
                                                            <RulesetName>Editing Ruleset</RulesetName>
                                                        </RulesetInfo>
                                                        <RulesetActions>
                                                            <Button
                                                                appearance="icon"
                                                                onClick={onCancelEdit}
                                                                tooltip="Cancel"
                                                            >
                                                                <Codicon name="close" sx={{ fontSize: '14px' }} />
                                                            </Button>
                                                            <Button
                                                                appearance="icon"
                                                                onClick={onSaveEdit}
                                                                tooltip="Save"
                                                                disabled={!editRulesetName || !editRulesetSourceFolder || !editRulesetFileName}
                                                            >
                                                                <Codicon name="check" sx={{ fontSize: '14px' }} />
                                                            </Button>
                                                        </RulesetActions>
                                                    </RulesetHeader>
                                                    <RulesetEditForm>
                                                        <FormGroup>
                                                            <Label>Name</Label>
                                                            <TextField
                                                                value={editRulesetName}
                                                                onTextChange={onEditNameChange}
                                                                placeholder="Ruleset name"
                                                            />
                                                        </FormGroup>
                                                        <FormGroup>
                                                            <Label>Source Folder</Label>
                                                            <TextField
                                                                value={editRulesetSourceFolder}
                                                                onTextChange={onEditSourceFolderChange}
                                                                placeholder="GitHub URL or local path"
                                                            />
                                                        </FormGroup>
                                                        <FormRow>
                                                            <FlexFormGroup>
                                                                <Label>File Name</Label>
                                                                <TextField
                                                                    value={editRulesetFileName}
                                                                    onTextChange={onEditFileNameChange}
                                                                    placeholder="filename.yaml"
                                                                />
                                                            </FlexFormGroup>
                                                            <FlexFormGroup>
                                                                <Label>Content Path</Label>
                                                                <TextField
                                                                    value={editRulesetContentPath}
                                                                    onTextChange={onEditContentPathChange}
                                                                    placeholder="rulesetContent"
                                                                />
                                                            </FlexFormGroup>
                                                        </FormRow>
                                                    </RulesetEditForm>
                                                </>
                                            ) : (
                                                <>
                                                    <RulesetHeader>
                                                        <RulesetInfo>
                                                            <Codicon name="shield" sx={{ fontSize: '14px' }} />
                                                            <RulesetName>{ruleset.name}</RulesetName>
                                                        </RulesetInfo>
                                                        <RulesetActions>
                                                            <Button
                                                                appearance="icon"
                                                                onClick={() => onStartEdit(originalIndex)}
                                                                tooltip="Edit"
                                                            >
                                                                <Codicon name="edit" sx={{ fontSize: '14px' }} />
                                                            </Button>
                                                            <Button
                                                                appearance="icon"
                                                                onClick={() => onRemove(originalIndex)}
                                                                tooltip="Remove"
                                                            >
                                                                <Codicon name="trash" sx={{ fontSize: '14px' }} />
                                                            </Button>
                                                        </RulesetActions>
                                                    </RulesetHeader>
                                                    <RulesetDetails>
                                                        <div><strong>File:</strong> {ruleset.fileName}</div>
                                                        <div><strong>Content Path:</strong> {ruleset.rulesetContentPath}</div>
                                                    </RulesetDetails>
                                                </>
                                            )}
                                        </RulesetItem>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <InfoText>No rulesets configured</InfoText>
                        )}
                    </RulesetList>

                    {isAdding ? (
                        <AddRulesetForm>
                            <FormGroup>
                                <Label>Ruleset Folder or File Path</Label>
                                <InputWithButton>
                                    <TextField
                                        value={newRulesetFolderPath}
                                        onTextChange={onFolderPathChange}
                                        placeholder="e.g., https://github.com/owner/repo/tree/main/rulesets or ./local/folder or ./path/to/ruleset.yaml"
                                        sx={{ width: '100%', paddingRight: '40px' }}
                                    />
                                    <FilePickerButton
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onBrowseFolder();
                                        }}
                                        title="Browse for folder"
                                    >
                                        <Codicon name="folder" sx={{ fontSize: '16px' }} />
                                    </FilePickerButton>
                                </InputWithButton>
                                <InfoText>Enter a GitHub URL, local folder path, or direct path to a YAML ruleset file</InfoText>
                                {rulesetError && <ErrorMessage>{rulesetError}</ErrorMessage>}
                            </FormGroup>

                            <FormRowSpaced>
                                <Button 
                                    appearance="secondary"
                                    onClick={onCancelAdding}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    appearance="primary"
                                    onClick={onFetchRulesets}
                                    disabled={!newRulesetFolderPath.trim() || isLoadingRulesets}
                                >
                                    {isLoadingRulesets ? (
                                        <>
                                            <Codicon name="sync~spin" sx={{ fontSize: '14px', marginRight: 6 }} />
                                            Loading...
                                        </>
                                    ) : (
                                        'Fetch Rulesets'
                                    )}
                                </Button>
                            </FormRowSpaced>

                            {fetchedRulesets.length > 0 && (
                                <>
                                    <FetchedRulesetsIntro>
                                        Found {fetchedRulesets.length} ruleset(s) in this folder:
                                    </FetchedRulesetsIntro>
                                    <RulesetList>
                                        {fetchedRulesets.map((ruleset, index) => (
                                            <RulesetItem key={index}>
                                                <RulesetInfo>
                                                    <RulesetName>
                                                        <Codicon name="file-code" sx={{ fontSize: '16px', marginRight: 8 }} />
                                                        {ruleset.name}
                                                    </RulesetName>
                                                    <RulesetDetails>
                                                        <span>{ruleset.fileName}</span>
                                                    </RulesetDetails>
                                                </RulesetInfo>
                                            </RulesetItem>
                                        ))}
                                    </RulesetList>
                                    <FormRowSpaced>
                                        <Button 
                                            appearance="primary"
                                            onClick={onAddFetchedRulesets}
                                            sx={{ width: '100%' }}
                                        >
                                            <Codicon name="add" sx={{ fontSize: '14px', marginRight: 6 }} />
                                            Add All Rulesets
                                        </Button>
                                    </FormRowSpaced>
                                </>
                            )}
                        </AddRulesetForm>
                    ) : (
                        <Button 
                            appearance="secondary"
                            onClick={onStartAdding}
                            sx={{ width: '100%', justifyContent: 'center' }}
                        >
                            <Codicon name="add" sx={{ fontSize: '14px', marginRight: 6 }} />
                            Add Ruleset
                        </Button>
                    )}
                </SubsectionContent>
            </CollapsibleContent>
        </FormGroup>
    );
};

