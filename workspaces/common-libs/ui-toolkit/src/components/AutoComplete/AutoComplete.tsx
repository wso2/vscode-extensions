/*
 *  Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 *  This software is the property of WSO2 LLC. and its suppliers, if any.
 *  Dissemination of any information or reproduction of any material contained
 *  herein is strictly forbidden, unless permitted by WSO2 in accordance with
 *  the WSO2 Commercial License available at http://wso2.com/licenses.
 *  For specific language governing the permissions and limitations under
 *  this license, please see the license as well as any agreement you’ve
 *  entered into with WSO2 governing the purchase of this software and any
 *  associated services.
 */
import React, { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { css, cx } from "@emotion/css";
import { Combobox, Transition } from '@headlessui/react'

import styled from '@emotion/styled';
import { RequiredFormInput } from '../Commons/RequiredInput';
import { Control, Controller } from 'react-hook-form';
import { ErrorBanner } from '../Commons/ErrorBanner';
import { Codicon } from '../Codicon/Codicon';
import { LinkButton } from '../LinkButton/LinkButton';

export interface ComboboxOptionProps {
    active?: boolean;
    display?: boolean;
}

export interface DropdownContainerProps {
    widthOffset?: number;
    dropdownWidth?: number;
    display?: boolean;
}

interface DropdownProps {
    hideDropdown: boolean;
}

const ActionButtonStyles = cx(css`
    display: flex;
    align-items: center;
    gap: 5px;
    padding-inline: 5px;
`);

const ActionButtonContainerActive = cx(css`
    background-color: var(--vscode-input-background);
    border-right: 0 solid var(--vscode-focusBorder);
    border-bottom: 1px solid var(--vscode-focusBorder);
    border-top: 1px solid var(--vscode-focusBorder);
    border-left: 0 solid var(--vscode-focusBorder); 
`);

const ActionButtonContainer = cx(css`
    background-color: var(--vscode-input-background);
    border-right: 0 solid var(--vscode-dropdown-border);
    border-bottom: 1px solid var(--vscode-dropdown-border);
    border-top: 1px solid var(--vscode-dropdown-border);
    border-left: 0 solid var(--vscode-dropdown-border);
`);

const ComboboxButtonContainerActive = cx(css`
    padding-right: 5px;
    padding-block: 0;
    background-color: var(--vscode-input-background);
    border-right: 1px solid var(--vscode-focusBorder);
    border-bottom: 1px solid var(--vscode-focusBorder);
    border-top: 1px solid var(--vscode-focusBorder);
    border-left: 0 solid var(--vscode-focusBorder);
`);

const ComboboxButtonContainer = cx(css`
    padding-right: 5px;
    padding-block: 0;
    background-color: var(--vscode-input-background);
    border-right: 1px solid var(--vscode-dropdown-border);
    border-bottom: 1px solid var(--vscode-dropdown-border);
    border-top: 1px solid var(--vscode-dropdown-border);
    border-left: 0 solid var(--vscode-dropdown-border);
`);

export const DropdownIcon = cx(css`
    color: var(--vscode-symbolIcon-colorForeground);
    padding-top: 4px;
    height: 20px;
    width: 16px;
    padding-right: 8px;
`);

export const SearchableInput = (hideDropdown: boolean) => cx(css`
    font-size: var(--vscode-font-size);
    color: var(--vscode-input-foreground);
    background-color: var(--vscode-input-background);
    height: ${hideDropdown ? '100%' : '26px'};
    width: ${hideDropdown ? '100%' : 'calc(100% - 35px)'};
    padding-left: 9px;
    padding-block: ${hideDropdown ? '5px' : '1px'};
    border-left: 1px solid var(--vscode-dropdown-border);
    border-bottom: 1px solid var(--vscode-dropdown-border);
    border-top: 1px solid var(--vscode-dropdown-border);
    border-right: ${hideDropdown ? '1px' : '0px'} solid var(--vscode-dropdown-border);
    &:focus {
      outline: none;
      border-left: 1px solid var(--vscode-focusBorder);
      border-bottom: 1px solid var(--vscode-focusBorder);
      border-top: 1px solid var(--vscode-focusBorder);
      border-right: ${hideDropdown ? '1px' : '0px'} solid var(--vscode-focusBorder);
    }
`);

const LabelContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin-bottom: 2px;
`;

const ComboboxInputWrapper = styled.div<DropdownProps>`
    height: 100%;
    display: flex;
    flex-direction: row;
    border-right: ${(props: DropdownProps) => props.hideDropdown ? '1px' : '0px'} solid var(--vscode-dropdown-border);
    &:focus-within {
        border-right: ${(props: DropdownProps) => props.hideDropdown ? '1px' : '0px'} solid var(--vscode-focusBorder);
    }
`;

export const OptionContainer = cx(css`
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-editor-selectionBackground);
    padding: 3px 5px 3px 5px;
    list-style-type: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
`);

export const ActiveOptionContainer = cx(css`
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-editor-background);
    list-style-type: none;
    padding: 3px 5px 3px 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
`);

export const NothingFound = styled.div`
    position: relative;
    cursor: default;
    user-select: none;
    padding-left: 8px;
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-editor-background);
`;

const DropdownContainer = styled.div<DropdownContainerProps>`
    position: absolute;
    top: 100%;
    max-height: 100px;
    overflow: auto;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    outline: none;
    border: 1px solid var(--vscode-list-dropBackground);
    padding-top: 5px;
    padding-bottom: 5px;
    z-index: 1000;
    display: ${(props: DropdownContainerProps) => (props.display ? 'block' : 'none')};
    width: ${(props: DropdownContainerProps) => (props.dropdownWidth ? `${props.dropdownWidth - 2}px` : 'auto')};
    ul {
        margin: 0;
        padding: 0;
    }
`;

interface ContainerProps {
    sx?: React.CSSProperties;
}

export const Container = styled.div<ContainerProps>`
    width: 100%;
    height: 100%;
    ${(props: ContainerProps) => props.sx}
`;

export interface ItemComponent {
    key: string; // For searching
    item: ReactNode; // For rendering option
}

interface BaseProps {
    id?: string;
    items: (string | ItemComponent)[];
    actionBtns?: ReactNode[];
    required?: boolean;
    widthOffset?: number;
    nullable?: boolean;
    allowItemCreate?: boolean;
    sx?: React.CSSProperties;
    borderBox?: boolean;
    onValueChange?: (item: string, index?: number) => void;
    value?: string;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    onCreateButtonClick?: () => void;
    notItemsFoundMessage?: string;
    hideDropdown?: boolean;
    errorMsg?: string;
    labelAdornment?: ReactNode,
    requireValidation?: boolean,
    disabled?: boolean;
}

// Define the conditional properties
type ConditionalProps =
    | { label: string; name: string; identifier?: never }
    | { label: string; name?: never; identifier?: never }
    | { label?: never; name: string; identifier?: never }
    | { label?: never; name?: never; identifier: string };

// Combine the base properties with conditional properties
export type AutoCompleteProps = BaseProps & ConditionalProps;

const ComboboxContent: React.FC<React.PropsWithChildren> = styled.div`
    position: relative;
    height: 100%;
`;

const ComboboxOption = styled.div<ComboboxOptionProps>`
    position: relative;
    cursor: default;
    user-select: none;
    color: var(--vscode-editor-foreground);
    background-color: ${(props: ComboboxOptionProps) => (props.active ? 'var(--vscode-editor-selectionBackground)' :
        'var(--vscode-editor-background)')};
    list-style: none;
    display: ${(props: ComboboxOptionProps) => (props.display === undefined ? 'block' : props.display ? 'block' : 'none')};
`;

export const getItemKey = (item: string | ItemComponent) => {
    if (typeof item === 'string') {
        return item;
    }
    return item?.key;
}

export const getItem = (item: string | ItemComponent) => {
    if (typeof item === 'string') {
        return item;
    }
    return item?.item;
}


export const AutoComplete = React.forwardRef<HTMLInputElement, AutoCompleteProps>((props, ref) => {
    const {
        id,
        name,
        value,
        items,
        actionBtns,
        required,
        label,
        labelAdornment,
        notItemsFoundMessage,
        widthOffset = 157,
        nullable,
        allowItemCreate = false,
        sx,
        borderBox,
        onBlur,
        onValueChange,
        onCreateButtonClick,
        identifier,
        hideDropdown,
        errorMsg,
        requireValidation = false
    } = props;
    const [query, setQuery] = useState('');
    const [isTextFieldFocused, setIsTextFieldFocused] = useState(false);
    const [isUpButton, setIsUpButton] = useState(false);
    const [dropdownWidth, setDropdownWidth] = useState<number>();
    const inputRef = useRef(null);
    const inputWrapperRef = useRef(null);
    const btnId = useMemo(() => name || label || identifier || getItemKey(items[0]), [name, items, label, identifier]);

    const handleChange = (item: string | ItemComponent) => {
        const index = items.findIndex(i => i === item);
        onValueChange && onValueChange(getItemKey(item), index);
    };
    const handleTextFieldFocused = () => {
        setIsTextFieldFocused(true);
    };
    const handleTextFieldClick = () => {
        if (!hideDropdown) {
            inputRef.current?.select();
            // This is to open the dropdown when the text field is focused.
            // This is a hacky way to do it since the Combobox component does not have a prop to open the dropdown.
            document.getElementById(`autocomplete-dropdown-button-${btnId}`)?.click();
            document.getElementById(props.value as string)?.focus();
        }
    };
    const handleTextFieldOutFocused = (e: any) => {
        setIsTextFieldFocused(false);
        setIsUpButton(false);
        onBlur && onBlur(e);
    };
    const handleComboButtonClick = () => {
        setIsUpButton(!isUpButton);
    };
    const handleQueryChange = (q: string) => {
        setQuery(q);
    };

    const handleInputQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };
    const displayItemValue = (item: string | ItemComponent) => getItemKey(item);

    const filteredResults =
        query === ''
            ? items
            : items.filter(filteredItem => {
                const item = getItemKey(filteredItem);
                return item.toLowerCase().replace(/\s+/g, '').includes(query.toLowerCase().replace(/\s+/g, ''))
            });

    const extactMatch = items.filter(item => getItemKey(item) === query);

    const indexOffset = allowItemCreate && extactMatch.length === 0 ? 1 : 0;

    const ComboboxOptionContainer = ({ active }: ComboboxOptionProps) => {
        return active ? OptionContainer : ActiveOptionContainer;
    };

    const handleAfterLeave = () => {
        handleQueryChange('');
    };

    useEffect(() => {
        setDropdownWidth(inputWrapperRef.current?.clientWidth);
    }, []);

    useEffect(() => {
        setDropdownWidth(inputRef.current?.clientWidth);
    }, []);

    return (
        <Container sx={sx}>
            <Combobox disabled={props.disabled} value={value} onChange={handleChange} name={name} {...(nullable && { nullable })}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {label && (
                        <LabelContainer>
                            <label htmlFor={id}>{label}</label>
                            {(required && label) && (<RequiredFormInput />)}
                            {labelAdornment && labelAdornment}
                        </LabelContainer>
                    )}
                    {allowItemCreate && onCreateButtonClick && <LinkButton onClick={onCreateButtonClick}>
                        <Codicon name="plus" />Add new
                    </LinkButton>}
                </div>
                <ComboboxContent>
                    <ComboboxInputWrapper ref={inputWrapperRef} hideDropdown={hideDropdown}>
                        <Combobox.Input
                            id={id}
                            ref={inputRef}
                            displayValue={displayItemValue}
                            onChange={handleInputQueryChange}
                            className={cx(SearchableInput(hideDropdown), borderBox && cx(css`
                                height: 26px;
                            `))}
                            onFocus={handleTextFieldFocused}
                            onClick={handleTextFieldClick}
                            onBlur={handleTextFieldOutFocused}
                        />
                        {actionBtns?.length && (
                            <div className={cx(
                                ActionButtonStyles,
                                isTextFieldFocused ? ActionButtonContainerActive : ActionButtonContainer
                            )}>
                                {actionBtns.map((btn, index) => (
                                    <React.Fragment key={index}>
                                        {btn}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                        <Combobox.Button
                            id={`autocomplete-dropdown-button-${btnId}`}
                            hidden={hideDropdown}
                            className={isTextFieldFocused ? ComboboxButtonContainerActive : ComboboxButtonContainer}
                        >
                            {isUpButton ? (
                                <i
                                    className={`codicon codicon-chevron-up ${DropdownIcon}`}
                                    onClick={handleComboButtonClick}
                                    onMouseDown={(e: React.MouseEvent) => {
                                        e.preventDefault()
                                    }}
                                />
                            ) : (
                                <i
                                    className={`codicon codicon-chevron-down ${DropdownIcon}`}
                                    onClick={handleComboButtonClick}
                                    onMouseDown={(e: React.MouseEvent) => {
                                        e.preventDefault()
                                    }}
                                />
                            )}
                        </Combobox.Button>
                    </ComboboxInputWrapper>
                    <Transition
                        as={Fragment}
                        afterLeave={handleAfterLeave}
                        ref={ref}
                    >
                        <DropdownContainer
                            // condition to display the dropdown
                            display={!(filteredResults.length === 0 && query !== "" && allowItemCreate && !onCreateButtonClick)}
                            widthOffset={widthOffset}
                            dropdownWidth={dropdownWidth}
                        >
                            <Combobox.Options>
                                {/* A hidden Combobox.Option which is used to create a new item */}
                                {filteredResults.length === 0 && query !== "" && !onCreateButtonClick ? (
                                    allowItemCreate && !requireValidation ? (
                                        <ComboboxOption key={0}>
                                            <Combobox.Option className={ComboboxOptionContainer} value={query} key={0}>
                                                {query}
                                            </Combobox.Option>
                                        </ComboboxOption>
                                    ) : (
                                        <NothingFound>{notItemsFoundMessage || "No options"}</NothingFound>
                                    )
                                ) : (
                                    <Fragment>
                                        {/**
                                         * A hidden Combobox.Option which is used to create a new item when the query is a
                                         * substring of the filtered results
                                        **/}
                                        {allowItemCreate && !requireValidation && extactMatch.length === 0 && (
                                            <ComboboxOption display={false} key={0}>
                                                <Combobox.Option className={ComboboxOptionContainer} value={query} key={0}>
                                                    {query}
                                                </Combobox.Option>
                                            </ComboboxOption>
                                        )}
                                        {filteredResults.map((filteredItem: string | ItemComponent, i: number) => {
                                            const item = getItem(filteredItem);
                                            return (
                                                <ComboboxOption key={i + indexOffset}>
                                                    <Combobox.Option
                                                        className={ComboboxOptionContainer}
                                                        value={filteredItem}
                                                        key={i}
                                                    >
                                                        {item}
                                                    </Combobox.Option>
                                                </ComboboxOption>
                                            );
                                        })}
                                    </Fragment>
                                )}
                            </Combobox.Options>
                        </DropdownContainer>
                    </Transition>
                </ComboboxContent>
                {errorMsg && (
                    <ErrorBanner errorMsg={errorMsg} />
                )}
            </Combobox>
        </Container>
    )
});
AutoComplete.displayName = 'AutoComplete';

interface FormAutoCompleteProps {
    name: string;
    label?: string;
    control: Control<any>;
    items: string[];
    isRequired?: boolean;
    isNullable?: boolean;
}

export const FormAutoComplete: React.FC<FormAutoCompleteProps> = ({ name, control, label, items, isNullable, isRequired }) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value } }) => {
                return (
                    <AutoComplete
                        items={items}
                        label={label}
                        required={isRequired}
                        nullable={isNullable}
                        value={value}
                        onValueChange={(val: string) => onChange(val)}
                    />
                );
            }}
        />
    );
};

