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

// DriverConfiguration.tsx
import { ComponentCard, FormGroup, TextField, Button, Codicon, ProgressRing } from '@wso2/ui-toolkit';
import React from 'react';
import styled from '@emotion/styled';

export interface DriverConfig {
  type: 'default' | 'custom' | 'maven';
  groupId?: string;
  artifactId?: string;
  version?: string;
  driverPath?: string;
}

interface DriverConfigProps {
  config: DriverConfig;
  onConfigChange: (config: DriverConfig) => void;
  onSave: () => void;
  onClear?: () => void;
  onSelectLocation?: () => void;
  isLoading?: boolean;
  error?: string;
  isReadOnly?: boolean;
}

export interface DriverOption {
  value: string;
  label: string;
  description: string;
  configType: DriverConfig['type'];
}

export const DRIVER_OPTIONS: DriverOption[] = [
  {
    value: 'default',
    label: 'Use Default Driver',
    description: 'Use the pre-configured default driver',
    configType: 'default'
  },
  {
    value: 'custom',
    label: 'Select Local Driver',
    description: 'Select a driver from local file system',
    configType: 'custom'
  },
  {
    value: 'maven',
    label: 'Add Maven Dependency',
    description: 'Add driver as Maven dependency',
    configType: 'maven'
  }
];

export const cardStyle = {
  display: "block",
  margin: "15px 0",
  padding: "0 15px 15px 15px",
  width: "auto",
  cursor: "auto"
};

const SpacedCodicon = styled(Codicon)`
  margin-right: 8px;
`;

export const DefaultDriverConfig: React.FC<DriverConfigProps> = ({
  config,
  isReadOnly = true
}) => {
  return (
    <ComponentCard id="default-driver-details" sx={cardStyle}>
      <FormGroup title="Default Driver Details" isCollapsed={false} sx={{ paddingTop: '10px', paddingBottom: '0px', gap: '0px' }}>
        <table>
          <tbody>
            <tr>
              <td>Group ID</td>
              <td>
                <TextField
                  value={config.groupId || ''}
                  readOnly={isReadOnly}
                  sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                />
              </td>
            </tr>
            <tr>
              <td>Artifact ID</td>
              <td>
                <TextField
                  value={config.artifactId || ''}
                  readOnly={isReadOnly}
                  sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                />
              </td>
            </tr>
            <tr>
              <td>Version</td>
              <td>
                <TextField
                  value={config.version || ''}
                  readOnly={isReadOnly}
                  sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </FormGroup>
    </ComponentCard>
  );
};

export const CustomDriverConfig: React.FC<DriverConfigProps> = ({
  config,
  onConfigChange,
  onSave,
  onClear,
  onSelectLocation,
  isLoading,
  error
}) => {
  const hasDriverPath = !!config.driverPath;
  return (
    <ComponentCard id="custom-driver-details" sx={cardStyle}>
      <FormGroup title="Select Driver Location" isCollapsed={false} sx={{ paddingTop: '10px', paddingBottom: '0px', gap: '0px' }}>
        {error && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            {error}
          </div>
        )}
        {hasDriverPath ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <table>
              <tbody>
                <tr>
                  <td>Group ID</td>
                  <td>
                    <TextField
                      value={config.groupId || ''}
                      readOnly={true}
                      sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Artifact ID</td>
                  <td>
                    <TextField
                      value={config.artifactId || ''}
                      readOnly={true}
                      sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>Version</td>
                  <td>
                    <TextField
                      value={config.version || ''}
                      readOnly={true}
                      sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button appearance="primary" onClick={onSave}>
                <SpacedCodicon name="save" iconSx={{ fontSize: '15px', marginRight: '10px' }} /> Save
              </Button>
              <Button appearance="secondary" onClick={onClear} disabled={!config.groupId}>
                <SpacedCodicon name="trash" iconSx={{ fontSize: '15px', color: "red", marginRight: '10px' }} /> Delete
              </Button>
            </div>
          </div>
        ) : (
          // View when no driver path is selected
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ marginBottom: '10px' }}>
              No driver selected. Please select a driver location to continue.
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button appearance="primary" onClick={onSelectLocation}>
                <SpacedCodicon name="folder-opened" /> Select Location
              </Button>
              {isLoading && (
                <ProgressRing />
              )}
            </div>
          </div>)}
      </FormGroup>
    </ComponentCard>
  );
};

export const MavenDriverConfig: React.FC<DriverConfigProps> = ({
  config,
  onConfigChange,
  onSave,
  onClear,
  error
}) => {
  return (
    <ComponentCard id="maven-driver-details" sx={cardStyle}>
      <FormGroup title="Add Maven Dependency" isCollapsed={false} sx={{ paddingTop: '10px', paddingBottom: '0px', gap: '0px' }}>
        {error && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            {error}
          </div>
        )}

        <table>
          <tbody>
            <tr>
              <td>Group ID</td>
              <td>
                <TextField
                  value={config.groupId || ''}
                  onChange={(e) => onConfigChange({ ...config, groupId: e.target.value })}
                  sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                />
              </td>
            </tr>
            <tr>
              <td>Artifact ID</td>
              <td>
                <TextField
                  value={config.artifactId || ''}
                  onChange={(e) => onConfigChange({ ...config, artifactId: e.target.value })}
                  sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                />
              </td>
            </tr>
            <tr>
              <td>Version</td>
              <td>
                <TextField
                  value={config.version || ''}
                  onChange={(e) => onConfigChange({ ...config, version: e.target.value })}
                  sx={{ paddingTop: '5px', paddingBottom: '10px', width: '50%' }}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button appearance="primary" onClick={onSave}>
            <SpacedCodicon name="save" iconSx={{ fontSize: '15px', marginRight: '10px' }} /> Save
          </Button>
          <Button appearance="secondary" onClick={onClear}>
            <SpacedCodicon name="clear-all" iconSx={{ fontSize: '15px', color: "red", marginRight: '10px' }} /> Clear
          </Button>
        </div>
      </FormGroup>
    </ComponentCard>
  );
};