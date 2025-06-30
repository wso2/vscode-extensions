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
import React, { useEffect, useRef } from 'react';
import { TextFieldProps, TextField } from '../TextField/TextField';
import { Icon } from '../Icon/Icon';

export interface PasswordFieldProps extends TextFieldProps {
    showPassword?: boolean;
    onPasswordToggle?: (showPassword: boolean) => void;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>((props, ref) => {
    const { showPassword = false, onPasswordToggle, ...rest } = props;
    const [isPasswordVisible, setPasswordVisibility] = React.useState(showPassword);
    const textFieldRef = useRef<HTMLInputElement | null>(null);
    React.useImperativeHandle(ref, () => textFieldRef.current);

    const handlePasswordToggle = () => {
        if (onPasswordToggle) {
            onPasswordToggle(!isPasswordVisible);
        }
        setPasswordVisibility(!isPasswordVisible);
    };

    const passwordToggleIconName = isPasswordVisible ? "eye" : "eye-closed";
    const passwordToggleIcon = (
        <div onClick={handlePasswordToggle} style={{ cursor: "pointer" }}>
            <Icon isCodicon name={passwordToggleIconName} />
        </div>
    );

    useEffect(() => {
        setPasswordVisibility(showPassword);
    }, [showPassword]);

    return (
        <TextField
            {...rest}
            ref={textFieldRef}
            type={isPasswordVisible ? "text" : "password"}
            icon={
                props.icon
                    ? {
                        iconComponent: props.icon.iconComponent,
                        position: props.icon.position,
                        onClick: props.icon.onClick,
                    }
                    : {
                        iconComponent: passwordToggleIcon,
                        position: "end",
                        onClick: handlePasswordToggle,
                    }
            }
        
        />
    );
});
PasswordField.displayName = "TextField";
