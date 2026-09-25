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
    position: relative;
    
    &::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 0;
        background-color: var(--vscode-editorHoverWidget-background);
        color: var(--vscode-editorHoverWidget-foreground);
        border: 1px solid var(--vscode-editorHoverWidget-border);
        padding: 5px 8px;
        border-radius: 3px;
        white-space: normal;
        word-wrap: break-word;
        max-width: 300px;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        pointer-events: none;
        margin-bottom: 5px;
        box-shadow: 0 2px 8px var(--vscode-widget-shadow);
    }
    
    &:hover::after {
        opacity: 1;
        visibility: visible;
    }
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
    position: relative;
    
    &::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 0;
        background-color: var(--vscode-editorHoverWidget-background);
        color: var(--vscode-editorHoverWidget-foreground);
        border: 1px solid var(--vscode-editorHoverWidget-border);
        padding: 5px 8px;
        border-radius: 3px;
        white-space: normal;
        word-wrap: break-word;
        max-width: 300px;
        z-index: 10000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        pointer-events: none;
        margin-bottom: 5px;
        box-shadow: 0 2px 8px var(--vscode-widget-shadow);
    }
    
    &:hover::after {
        opacity: 1;
        visibility: visible;
    }
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
    description?: string | ReactNode;
    descriptionSx?: React.CSSProperties;
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

const Description = styled.div<ContainerProps>`
    color: var(--vscode-list-deemphasizedForeground);
    margin-bottom: 4px;
    text-align: left;
    ${(props: ContainerProps) => props.sx};
`;

// data-option-index of the hidden option that creates an item from the typed text; other options carry
// their index in `items`.
const CREATE_OPTION_INDEX = 'create';

export const AutoComplete = React.forwardRef<HTMLInputElement, AutoCompleteProps>((props, ref) => {
    const {
        id,
        name,
        description,
        descriptionSx,
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
    // True from the input's blur until its next focus. Headless UI runs our onBlur before its own, so
    // this is already set when Headless UI emits its blur-time change.
    const isInputBlurredRef = useRef(false);
    // The Combobox's active (highlighted) option, captured when the input blurs.
    const blurActiveOptionRef = useRef<string | ItemComponent | null>(null);
    // Key of the item committed by our own blur handling (commitOnBlur), until the next focus. Headless
    // UI may commit the same item right after; handleChange drops that duplicate.
    const blurCommittedKeyRef = useRef<string | undefined>(undefined);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const optionsRef = useRef<HTMLUListElement>(null);

    // The item the typed text stands for: an item whose key exactly matches it or, when item creation
    // is allowed, the typed text itself (the value of the hidden create option).
    const resolveTypedText = (): string | ItemComponent | null => {
        const match = items.find(i => getItemKey(i) === query);
        if (match !== undefined) {
            return match;
        }
        return allowItemCreate && !requireValidation ? query : null;
    };

    // On blur, a nullable Combobox whose value is null emits onChange(null) instead of committing the
    // active option, which would drop text the user typed but never confirmed. Resolve that null to the
    // active option, as a non-nullable Combobox commits on blur, falling back to an item whose key
    // exactly matches the typed text or, when item creation is allowed, to the typed text itself (the
    // value of the hidden create option). An empty query still yields null, so clearing an optional
    // field keeps working. Only the blur path is handled: the input's own onChange(null) (text cleared)
    // and Escape both run while focused and must keep clearing/reverting.
    const resolveBlurItem = (item: string | ItemComponent) => {
        if ((item !== null && item !== undefined) || !isInputBlurredRef.current || query === '') {
            return item;
        }
        if (blurActiveOptionRef.current !== null) {
            return blurActiveOptionRef.current;
        }
        return resolveTypedText() ?? item;
    };

    const commitItem = (item: string | ItemComponent) => {
        onValueChange && onValueChange(getItemKey(item), items.findIndex(i => i === item));
    };

    const handleChange = (changedItem: string | ItemComponent) => {
        const item = resolveBlurItem(changedItem);
        if (isInputBlurredRef.current && blurCommittedKeyRef.current !== undefined
            && getItemKey(item) === blurCommittedKeyRef.current) {
            return;
        }
        commitItem(item);
    };
    const handleTextFieldFocused = () => {
        isInputBlurredRef.current = false;
        blurCommittedKeyRef.current = undefined;
        setIsTextFieldFocused(true);
    };
    const handleTextFieldClick = () => {
        if (!hideDropdown) {
            inputRef.current?.select();
            // This is to open the dropdown when the text field is focused.
            // This is a hacky way to do it since the Combobox component does not have a prop to open the dropdown.
            // An ArrowDown on the button opens it like a click does, but unlike a click it is not recorded in
            // Headless UI's focus history. A recorded button makes a later blur with no relatedTarget (e.g.
            // focus leaving the webview) look like focus moving to the button, so the typed text is dropped.
            buttonRef.current?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            document.getElementById(props.value as string)?.focus();
        }
    };
    // The active option as Headless UI currently sees it, read from the input's aria-activedescendant.
    // Headless UI's activeOption render prop is not usable here: it is memoized on the Combobox state,
    // so it goes stale while typing changes the value of an option that is already active.
    const getActiveOption = (): string | ItemComponent | null => {
        const input: HTMLInputElement | null = inputRef.current;
        const activeId = input?.getAttribute('aria-activedescendant');
        const optionIndex = activeId ? input.ownerDocument.getElementById(activeId)?.dataset.optionIndex : undefined;
        if (optionIndex === undefined) {
            return null;
        }
        return optionIndex === CREATE_OPTION_INDEX ? query : items[Number(optionIndex)] ?? null;
    };

    // The item the typed text resolves to when it should be committed in place of an active option:
    // the dropdown is open, no option is active, and the text resolves to a value other than the
    // current one. Otherwise null.
    const getUncommittedTypedItem = (input: HTMLInputElement): string | ItemComponent | null => {
        if (query === '' || input.getAttribute('aria-expanded') !== 'true' || getActiveOption() !== null) {
            return null;
        }
        const item = resolveTypedText();
        if (item === null || (value !== null && value !== undefined && getItemKey(item) === getItemKey(value))) {
            return null;
        }
        return item;
    };

    // Enter and Tab with no active option (e.g. after the pointer crossed the options and left them)
    // close the Combobox without committing anything, dropping the typed text. Commit it here; our
    // onKeyDown runs before Headless UI's. Escape is left alone so it keeps reverting.
    const handleTextFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter' && e.key !== 'Tab') {
            return;
        }
        const item = getUncommittedTypedItem(e.currentTarget);
        if (item !== null) {
            commitItem(item);
        }
    };

    // Commit on blur what Headless UI would drop:
    // - With no active option, its blur commits nothing (except for a nullable Combobox whose value is
    //   null, where it emits onChange(null), which resolveBlurItem handles). Moving the pointer over the
    //   options and off them again leaves no option active, so the typed text would be lost.
    // - With no relatedTarget (e.g. focus leaving the webview), it falls back to its focus history. A
    //   real click on the chevron records the button there, so it then treats the blur as focus moving
    //   to the button and commits nothing. Commit what it would have: the active option or typed text.
    // Skipped when focus moves into this Combobox's options or button, where the user is still choosing.
    // If Headless UI commits the same item afterwards (e.g. onChange(null) for a nullable Combobox),
    // handleChange drops the duplicate.
    const commitOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const next = e.relatedTarget instanceof Node ? e.relatedTarget : null;
        if (next && (optionsRef.current?.contains(next) || buttonRef.current?.contains(next))) {
            return;
        }
        let item = getUncommittedTypedItem(input);
        if (item === null && next === null && query !== '' && input.getAttribute('aria-expanded') === 'true') {
            const active = blurActiveOptionRef.current;
            const isCurrentValue = active !== null && value !== null && value !== undefined
                && getItemKey(active) === getItemKey(value);
            item = isCurrentValue ? null : active;
        }
        if (item !== null) {
            blurCommittedKeyRef.current = getItemKey(item);
            commitItem(item);
        }
    };

    const handleTextFieldOutFocused = (e: React.FocusEvent<HTMLInputElement>) => {
        isInputBlurredRef.current = true;
        blurActiveOptionRef.current = getActiveOption();
        commitOnBlur(e);
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
                {description && (
                    <Description sx={descriptionSx}>
                        {description}
                    </Description>
                )}
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
                            onKeyDown={handleTextFieldKeyDown}
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
                            ref={buttonRef}
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
                            id={"dropdown-container"}
                            display={!(filteredResults.length === 0 && query !== "" && allowItemCreate && !onCreateButtonClick)}
                            widthOffset={widthOffset}
                            dropdownWidth={dropdownWidth}
                        >
                            <Combobox.Options ref={optionsRef}>
                                {/* A hidden Combobox.Option which is used to create a new item */}
                                {filteredResults.length === 0 && query !== "" && !onCreateButtonClick ? (
                                    allowItemCreate && !requireValidation ? (
                                        <ComboboxOption key={0}>
                                            <Combobox.Option className={ComboboxOptionContainer} value={query} key={0} data-option-index={CREATE_OPTION_INDEX}>
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
                                                <Combobox.Option className={ComboboxOptionContainer} value={query} key={0} data-option-index={CREATE_OPTION_INDEX}>
                                                    {query}
                                                </Combobox.Option>
                                            </ComboboxOption>
                                        )}
                                        {filteredResults.map((filteredItem: string | ItemComponent, i: number) => {
                                            const item = getItem(filteredItem);
                                            const itemKey = getItemKey(filteredItem);
                                            return (
                                                <ComboboxOption key={i + indexOffset}>
                                                    <Combobox.Option
                                                        className={ComboboxOptionContainer}
                                                        value={filteredItem}
                                                        key={i}
                                                        data-option-index={items.indexOf(filteredItem)}
                                                    >
                                                        {({ active }) => (
                                                            <div
                                                                className={active ? OptionContainer : ActiveOptionContainer}
                                                                data-tooltip={itemKey}
                                                                title={itemKey}
                                                            >
                                                                {item}
                                                            </div>
                                                        )}
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

