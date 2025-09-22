import React, { useState } from 'react';
import { Button, CheckBox, Codicon } from '@wso2/ui-toolkit';
import { Type } from '@wso2/ballerina-core';

interface AdvancedOptionsProps {
    type: Type;
    onChange: (type: Type) => void;
}

enum TypeNodeKind {
    RECORD = "RECORD",
    ENUM = "ENUM",
    CLASS = "CLASS",
    UNION = "UNION",
    ARRAY = "ARRAY"
}

export function AdvancedOptions({ type, onChange }: AdvancedOptionsProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    return (
        <div>
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '15px', marginBottom: '5px', cursor: 'pointer' }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Button
                    appearance='icon'
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                >
                    <Codicon name={isExpanded ? "chevron-up" : "chevron-down"} />
                </Button>
                <span>Advanced Options</span>
            </div>
            {isExpanded && (
                <>
                {type.codedata.node===TypeNodeKind.RECORD && <CheckBox
                    sx={{ border: 'none', padding: '5px' }}
                    label="Allow Additional Fields"
                    checked={type?.allowAdditionalFields === true}
                    onChange={(checked: boolean) => {
                        onChange({ ...type, allowAdditionalFields: checked });
                    }}
                />}
                <CheckBox
                    sx={{ border: 'none', padding: '5px' }}
                    label="Is Readonly Type"
                    checked={type?.properties?.isReadOnly?.value === "true"}
                    onChange={(checked: boolean) => {
                        // Match the same pattern used in the working checkbox
                        onChange({
                            ...type,
                            properties: {
                                ...type.properties,
                                isReadOnly: {
                                    ...type.properties?.isReadOnly,
                                    value: checked ? "true" : "false"
                                }
                            }
                        });
                    }}
                />
                </>
            )}
        </div>
    );
}
