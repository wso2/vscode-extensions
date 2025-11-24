// GenericRadioGroup.tsx
import { Icon, RadioButtonGroup, Tooltip } from '@wso2/ui-toolkit';
import React from 'react';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface GenericRadioGroupProps {
  name: string;
  label: string;
  options: RadioOption[];
  value: string;
  helpTip?: string;
  onChange: (value: string) => void;
  required?: boolean;
  orientation?: 'vertical' | 'horizontal';
}
// Removed unused helpTipElement definition as helpTip is not defined.
// The helpTipElement prop is already passed to the component.

export const GenericRadioGroup: React.FC<GenericRadioGroupProps> = ({
  name,
  label,
  options,
  value,
  helpTip,
  onChange,
  required,
  orientation = 'vertical',

}) => {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: '2px' }}>
        <label>{label}{required && '*'}</label>

        {helpTip && <Tooltip
          content={helpTip}
          position='right'
        >
          <Icon name="question" isCodicon iconSx={{ fontSize: '18px' }} sx={{ marginLeft: '2px', cursor: 'help' }} />
        </Tooltip>}
      </div>
      <RadioButtonGroup
        name={name}
        orientation={orientation}
        options={options.map(option => ({
          content: option.label,
          value: option.value
        }))}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        required={required}
      />
    </>
  );
};