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

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Transition } from "@headlessui/react";
import classNames from "classnames";
import React from "react";
import type { ReactNode } from "react";
import type { FC } from "react";
import { Button } from "../Button";
import { Codicon } from "../Codicon";

export interface StepItem {
	label: string;
	content: ReactNode;
}

interface Props {
	steps?: StepItem[];
	currentStep?: number;
	setCurrentStep?: (step: number) => void;
	submitBtnTitle?: string;
	submitBtnDisabled?: boolean;
}

export const VerticalStepper: FC<Props> = (props) => {
	const { steps = [] } = props;
	const [stepperRootRef] = useAutoAnimate();

	return (
		<div ref={stepperRootRef}>
			{steps.map((step, index) => (
				<VerticalStepperItem key={step.label} item={step} index={index} totalSteps={steps.length} {...props} />
			))}
		</div>
	);
};

interface StepItemProps extends Omit<Props, "steps"> {
	item: StepItem;
	index: number;
	totalSteps: number;
}

export const VerticalStepperItem: FC<StepItemProps> = ({
	item,
	index,
	totalSteps,
	currentStep,
	submitBtnTitle = "Submit",
	submitBtnDisabled,
	setCurrentStep,
}) => {
	const [stepperItemRef] = useAutoAnimate();
	const [stepperItemIconRef] = useAutoAnimate();

	return (
		<div>
			<div className="flex items-center gap-2">
				<div
					ref={stepperItemIconRef}
					className={classNames(
						"flex h-5 w-5 items-center justify-center rounded-[100px] font-thin text-xs transition-colors duration-500",
						index <= currentStep ? "bg-vsc-button-background text-vsc-button-foreground" : "bg-vsc-editorIndentGuide-background",
					)}
				>
					{index < currentStep ? <Codicon name="check" className="!text-xs" /> : <span>{index + 1}</span>}
				</div>
				<div className={classNames("text-base", index <= currentStep ? "font-semibold" : "font-light opacity-70")}>{item.label}</div>
			</div>
			<div className="flex">
				<div className={classNames("w-5 justify-center py-2", index === currentStep ? "hidden sm:flex" : "flex")}>
					<div className={classNames("h-full w-1 rounded-[4px]", index < totalSteps - 1 && "min-h-4 bg-vsc-editorIndentGuide-background")} />
				</div>
				<div ref={stepperItemRef} className="flex-1">
					{index === currentStep && (
						<div key={item.label} className="sm:p-2">
							<div className="w-full">{item.content}</div>
							{setCurrentStep && (
								<div className="flex justify-end gap-3 pt-6 pb-2">
									<Button onClick={() => setCurrentStep(currentStep - 1)} disabled={index === 0} appearance="secondary">
										Back
									</Button>
									<Button onClick={() => setCurrentStep(currentStep + 1)} disabled={submitBtnDisabled}>
										{currentStep < totalSteps - 1 ? "Next" : submitBtnTitle}
									</Button>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
