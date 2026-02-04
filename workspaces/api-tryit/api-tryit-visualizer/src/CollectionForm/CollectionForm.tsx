import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, TextField } from '@wso2/ui-toolkit';
import { getVSCodeAPI } from '../utils/vscode-api';

const vscode = getVSCodeAPI();

const Drawer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    background: var(--vscode-editor-background);
    padding: 24px;
    box-sizing: border-box;
    z-index: 200;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
`;

const Title = styled.h3`
    margin: 0;
    font-size: 14px;
    color: var(--vscode-foreground);
`;

const FormContainer = styled.div`
    width: 100%;
    max-width: 500px;
    padding: 32px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Actions = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 8px;
`;

const FolderSelector = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const FolderPath = styled.div`
    padding: 8px 12px;
    height: 12px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-size: 12px;
    color: var(--vscode-foreground);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const FolderButton = styled.button`
    padding: 6px 12px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    
    &:hover {
        background: var(--vscode-button-hoverBackground);
    }
`;

const Label = styled.label`
    font-size: 13px;
    color: var(--vscode-foreground);
    font-weight: 500;
    margin-bottom: 4px;
`;

export const CollectionForm: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
    const [name, setName] = useState('');
    const [folderPath, setFolderPath] = useState<string | null>(null);

    const handleSelectFolder = () => {
        // Send message to extension to open folder selector
        console.log('[CollectionForm] Sending selectCollectionFolder message to extension');
        if (vscode) {
            vscode.postMessage({ type: 'selectCollectionFolder' });
        }
    };

    // Listen for folder selection response
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, data } = event.data;
            console.log('[CollectionForm] Received message from extension:', type, data);
            if (type === 'collectionFolderSelected') {
                console.log('[CollectionForm] Setting folder path to:', data.path);
                setFolderPath(data.path);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!name.trim() && !folderPath) return;

        // Send message to extension to create collection
        if (vscode) {
            vscode.postMessage({ 
                type: 'createCollectionSubmit', 
                data: { 
                    name: name.trim(),
                    folderPath: folderPath
                } 
            });
        }
    };

    return (
        <Drawer role="dialog" aria-label="Create Collection">
            <FormContainer>
                <Header>
                    <Title>Create New Collection</Title>
                    <button onClick={onCancel} title="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--vscode-descriptionForeground)', padding: '4px' }}>
                        <Codicon name="chrome-close" />
                    </button>
                </Header>

                <Form onSubmit={handleSubmit}>
                    <div>
                        <TextField 
                            label='Collection Name'
                            id="collection-name"
                            value={name} 
                            onChange={(e: any) => setName(e.target.value)} 
                            placeholder="My API Collection" 
                            aria-label="Collection name" 
                            autoFocus 
                        />
                    </div>

                    <div style={{display: "flex", flexDirection: "column"}}>
                        {/* Location Label */}
                        <Label htmlFor="collection-folder">Location</Label>
                        <FolderSelector>
                            <FolderPath>
                                {folderPath || 'No folder selected'}
                            </FolderPath>
                            <FolderButton onClick={handleSelectFolder} type="button">
                                Browse
                            </FolderButton>
                        </FolderSelector>
                    </div>

                    <Actions>
                        <Button onClick={handleSubmit}>Create</Button>
                        <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
                    </Actions>
                </Form>
            </FormContainer>
        </Drawer>
    );
};

export default CollectionForm;
