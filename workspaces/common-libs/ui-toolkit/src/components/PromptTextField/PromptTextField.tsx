import React, { forwardRef, useCallback } from 'react';
import styled from '@emotion/styled';
import { AutoResizeTextArea, TextAreaProps } from '../TextArea/TextArea';
import { RequiredFormInput } from '../Commons/RequiredInput';
import { ErrorBanner } from '../Commons/ErrorBanner';

export interface PromptTextFieldProps extends Omit<TextAreaProps, 'onTextChange'> {
    onTextChange?: (text: string) => void;
    onEnter?: (text: string) => void;
}

const Container = styled.div<{ sx?: any }>`
    ${(props: any) => props.sx};
`;

const LabelContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin-bottom: 4px;
`;

const StyledTextArea = styled(AutoResizeTextArea)`
    ::part(control) {
        font-family: monospace;
        font-size: 12px;
        min-height: 20px;
        padding: 5px 8px;
    }
`;

export const PromptTextField = forwardRef<HTMLTextAreaElement, PromptTextFieldProps>(
    (props, ref) => {
        const {
            label,
            id,
            required,
            errorMsg,
            sx,
            onTextChange,
            onEnter,
            ...rest
        } = props;

        const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter') {
                if (e.ctrlKey || e.metaKey) {
                    // Allow new line with Ctrl+Enter
                    return;
                }
                e.preventDefault();
                onEnter?.(e.currentTarget.value);
                return;
            }
        }, [onEnter]);

        return (
            <Container sx={sx}>
                <StyledTextArea
                    {...rest}
                    ref={ref}
                    onKeyDown={handleKeyDown}
                    onTextChange={onTextChange}
                    growRange={{ start: 1, offset: 7 }}
                >
                    {label && (
                        <LabelContainer>
                            <div style={{ color: "var(--vscode-editor-foreground)" }}>
                                <label htmlFor={`${id}-label`}>{label}</label>
                            </div>
                            {(required && label) && (<RequiredFormInput />)}
                        </LabelContainer>
                    )}
                </StyledTextArea>
                {errorMsg && (
                    <ErrorBanner errorMsg={errorMsg} />
                )}
            </Container>
        );
    }
);

PromptTextField.displayName = 'PromptTextField'; 
