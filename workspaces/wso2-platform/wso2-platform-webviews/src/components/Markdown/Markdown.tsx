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
import { VSCodeLink, VSCodePanelTab, VSCodePanelView, VSCodePanels } from "@vscode/webview-ui-toolkit/react";
import classNames from "classnames";
import clipboardy from "clipboardy";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import React, { type PropsWithChildren, type ReactNode, useState, type FC } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import gfm from "remark-gfm";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";
import { Button } from "../Button";
import { Codicon } from "../Codicon";
import { SkeletonText } from "../SkeletonText";

interface Props {
	children?: any;
}

interface TabItem {
	key: string;
	title: string;
	view: ReactNode;
}

interface TabProps {
	items: TabItem[];
}

const Tabs: FC<TabProps> = ({ items = [] }) => {
	return (
		<VSCodePanels>
			{items.map((item) => (
				<VSCodePanelTab id={`tab-${item.key}`} key={`tab-${item.key}`} className="capitalize">
					{item.title}
				</VSCodePanelTab>
			))}
			{items.map((item) => (
				<VSCodePanelView id={`view-${item.key}`} key={`view-${item.key}`}>
					<div className="w-full">{item.view}</div>
				</VSCodePanelView>
			))}
		</VSCodePanels>
	);
};

const markDownOverrides: { [key: string]: FC<PropsWithChildren<any>> } = {
	h1: ({ children }) => <h1 className="mt-4 mb-2 pb-1 font-bold text-3xl">{children}</h1>,
	h2: ({ children }) => <h2 className="mt-3 mb-2 pb-1 font-bold text-2xl">{children}</h2>,
	h3: ({ children }) => <h3 className="mt-2 mb-1 font-semibold text-xl">{children}</h3>,
	h4: ({ children }) => <h4 className="mt-2 mb-1 font-semibold text-lg">{children}</h4>,
	h5: ({ children }) => <h5 className="mt-1 mb-0.5 font-medium text-base">{children}</h5>,
	h6: ({ children }) => <h6 className="mt-1 mb-0.5 font-medium text-sm">{children}</h6>,
	p: ({ children }) => <p className="mt-0.5 mb-3">{children}</p>,
	a: ({ children, ...props }: any) => {
		if (props.href) {
			return <VSCodeLink onClick={() => ChoreoWebViewAPI.getInstance().openExternal(props.href)}>{children}</VSCodeLink>;
		}
		return children;
	},
	ul: ({ children }) => <ul className="my-2 list-inside list-disc font-light">{children}</ul>,
	ol: ({ children }) => <ol className="my-2 list-inside list-decimal font-light">{children}</ol>,
	li: ({ children }) => <li className="mb-1">{children}</li>,
	blockquote: ({ children }) => (
		<blockquote className="my-2 rounded-sm border-l-4 border-opacity-30 pl-4 italic text-opacity-60">{children}</blockquote>
	),
	// TODO: move into separate component
	code: ({ children, className, node }) => {
		const isInline = !className && node?.position?.end?.line === node?.position?.start?.line;
		// Extract language from className
		const match = /language-(\w+)/.exec(className || "");
		const language: any = match != null ? match[1] : "markdown";
		const code = String(children).replace(/\n$/, "");

		const { mutate: copyToClipboard } = useMutation({
			mutationFn: (text: string) => clipboardy.write(text),
			onSuccess: () => ChoreoWebViewAPI.getInstance().showInfoMsg("Code has been copied to the clipboard."),
		});
		if (isInline) {
			return <code className="bg-transparent font-mono text-[11px] ">{children}</code>;
		}

		const prismTheme: PrismTheme = {
			plain: { color: "var(--vscode-editor-foreground)" },
			styles: [
				{ types: ["variable", "operator"], style: { color: "var(--vscode-descriptionForeground)" } },
				{ types: ["prolog"], style: { color: "var(--vscode-terminal-ansiBlue)" } },
				{ types: ["comment", "punctuation"], style: { color: "var(--vscode-editorGutter-addedBackground)", opacity: 0.85 } },
				{ types: ["builtin"], style: { color: "var(--vscode-editorInfo-foreground)" } },
				{ types: ["number", "inserted"], style: { color: "var(--vscode-debugTokenExpression-number)" } },
				{ types: ["constant", "hexcode"], style: { color: "var(--vscode-input-placeholderForeground)" } },
				{ types: ["changed", "keyword"], style: { color: "var(--vscode-peekView-border)" } },
				{ types: ["tag"], style: { color: "var(--vscode-charts-green)" } },
				{ types: ["function"], style: { color: "var(--vscode-editorLightBulb-foreground)" } },
				{ types: ["attr-name", "selector", "property"], style: { color: "var(--vscode-symbolIcon-variableForeground)" } }, //
				{ types: ["deleted", "string"], style: { color: "var(--vscode-notificationsWarningIcon-foreground)" } }, //
				{ types: ["regex", "char"], style: { color: "var(--vscode-errorForeground)" } },
				{
					types: ["class-name"],
					style: { color: "var(--vscode-gitDecoration-untrackedResourceForeground, var(--vscode-charts-green))" },
				},
			],
		};

		return (
			<div className="relative mt-2 mb-4">
				<Button appearance="icon" onClick={() => copyToClipboard(children)} className="absolute top-1 right-1" title="Copy code to clipboard">
					<Codicon name="copy" />
				</Button>
				<Highlight theme={prismTheme} language={language} code={code.trim()}>
					{({ className, tokens, getLineProps, getTokenProps }) => (
						<pre
							className={classNames(
								className,
								"overflow-auto rounded border border-vsc-editorIndentGuide-background bg-vsc-editor-background bg-opacity-10 p-2 font-mono text-[11px]",
							)}
						>
							<div />

							{tokens.map((line, lineNumber) => {
								const { className: linePropClassName } = getLineProps({ line, key: lineNumber });
								return (
									<div className={linePropClassName} key={`code-line-${lineNumber}`}>
										{line.map((token, key) => (
											<span {...getTokenProps({ token, key })} key={`code-${lineNumber}-${key}`} />
										))}
									</div>
								);
							})}
						</pre>
					)}
				</Highlight>
			</div>
		);
	},
	img: ({ src, alt }: any) => <img src={src} alt={alt} className="mt-1 mb-2 h-auto max-w-full rounded" />,
	strong: ({ children }) => <strong className="font-bold">{children}</strong>,
	em: ({ children }) => <em className="font-light italic">{children}</em>,
	hr: () => <hr className="my-4 border-vsc-editorIndentGuide-background" />,
	table: ({ children }) => (
		<table className="mt-2 mb-4 w-full border-collapse rounded border border-vsc-editorIndentGuide-background">{children}</table>
	),
	thead: ({ children }) => <thead className="border-opacity-60 bg-vsc-editorIndentGuide-background">{children}</thead>,
	tbody: ({ children }) => <tbody className="bg-vsc-editor-background">{children}</tbody>,
	th: ({ children }) => <th className="border border-vsc-editorIndentGuide-background p-2 text-left font-medium">{children}</th>,
	td: ({ children }) => <td className="border border-vsc-editorIndentGuide-background p-2 font-extralight">{children}</td>,
	tab: ({ children }) => {
		const panelTabs: TabItem[] = [];
		if (Array.isArray(children)) {
			children.forEach((item) => {
				if (item.type === "webapp") {
					const customWebappTabs = ["managed-auth", "external-idp-custom", "custom"];
					const webappChildren = item?.props?.children?.filter((item: any) => !customWebappTabs.includes(item.type));
					const webappSubsectionTabs: TabItem[] = [];
					item?.props?.children
						?.filter((item: any) => customWebappTabs.includes(item.type))
						.forEach((item: any) => {
							if (item?.type === "managed-auth") {
								webappSubsectionTabs.push({ key: item.type, title: "Managed Auth", view: item.props.children });
							} else if (item?.type === "external-idp-custom") {
								webappSubsectionTabs.push({ key: item.type, title: "External IDP", view: item.props.children });
							} else if (item?.type === "custom") {
								webappSubsectionTabs.push({ key: item.type, title: "Other", view: item.props.children });
							}
						});
					if (webappSubsectionTabs.length > 1) {
						webappChildren.push(<Tabs items={webappSubsectionTabs} />);
					} else if (webappSubsectionTabs?.length === 1) {
						webappChildren.push(<div>{webappSubsectionTabs[0]?.view}</div>);
					}
					panelTabs.push({ key: item.type, title: item.type, view: webappChildren });
				} else if (item.type) {
					panelTabs.push({ key: item.type, title: item.type, view: item.props.children });
				}
			});
		}
		if (panelTabs.length > 1) {
			return <Tabs items={panelTabs} />;
		}
		return <>{children}</>;
	},
	details: ({ children }) => {
		const filtered = children.filter((item: ReactNode) => typeof item !== "string" || item.trim());
		const [isOpen, setIsOpen] = useState(false);
		const title = filtered[0]?.type === "summary" ? filtered[0]?.props?.children : "";
		const otherElements = title ? filtered.slice(1) : filtered;

		return (
			<div className="mb-1">
				<div onClick={() => setIsOpen(!isOpen)} className="flex cursor-pointer items-center gap-1">
					{isOpen ? <Codicon name="chevron-down" /> : <Codicon name="chevron-right" />}
					{title}
					<VSCodeLink className="mt-0.5 ml-1 font-thin text-[10px] text-vsc-foreground">{isOpen ? "(Show Less)" : "(Show more)"}</VSCodeLink>
				</div>
				{isOpen && <div className="py-1 opacity-90">{otherElements}</div>}
			</div>
		);
	},
};

export const Markdown: FC<Props> = ({ children }) => {
	return (
		<ReactMarkdown remarkPlugins={[gfm]} rehypePlugins={[rehypeRaw]} components={markDownOverrides}>
			{children}
		</ReactMarkdown>
	);
};

export const MarkdownSkeleton: FC = () => {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<SkeletonText className="w-36" />
				<div className="my-0.5 h-20 animate-pulse rounded bg-vsc-button-secondaryBackground" />
			</div>
			<div className="flex flex-col gap-2">
				<SkeletonText className="w-52" />
				<div className="my-0.5 h-44 animate-pulse rounded bg-vsc-button-secondaryBackground" />
			</div>
			<div className="flex flex-col gap-2">
				<SkeletonText className="w-36" />
				<div className="my-0.5 h-24 animate-pulse rounded bg-vsc-button-secondaryBackground" />
				<div className="my-0.5 h-16 animate-pulse rounded bg-vsc-button-secondaryBackground" />
			</div>
			<div className="flex flex-col gap-2">
				<SkeletonText className="w-60" />
				<div className="my-0.5 h-60 animate-pulse rounded bg-vsc-button-secondaryBackground" />
			</div>
		</div>
	);
};
