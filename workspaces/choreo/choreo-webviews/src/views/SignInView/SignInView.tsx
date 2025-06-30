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

import { useMutation } from "@tanstack/react-query";
import { CommandIds } from "@wso2/choreo-core";
import classNames from "classnames";
import React, { type FC, type HTMLProps } from "react";
import { Button } from "../../components/Button";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";

interface Props {
	className?: HTMLProps<HTMLElement>["className"];
}

export const SignInView: FC<Props> = ({ className }) => {
	const { mutate: signInCmd, isLoading: isInitSignIn } = useMutation({
		mutationFn: async () => ChoreoWebViewAPI.getInstance().triggerCmd(CommandIds.SignIn),
	});
	return (
		<div className={classNames("flex w-full flex-col gap-[10px] px-6 py-2", className)}>
			<p>Sign in to Choreo to get started.</p>
			<Button className="w-full max-w-80 self-center sm:self-start" onClick={() => signInCmd()} disabled={isInitSignIn}>
				Sign In
			</Button>
		</div>
	);
};
