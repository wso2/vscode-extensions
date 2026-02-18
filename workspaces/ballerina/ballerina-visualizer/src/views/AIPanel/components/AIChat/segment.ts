export enum SegmentType {
    Code = "Code",
    Text = "Text",
    Progress = "Progress",
    ToolCall = "ToolCall",
    Todo = "Todo",
    Attachment = "Attachment",
    InlineCode = "InlineCode",
    References = "References",
    TestScenario = "TestScenario",
    Button = "Button",
    SpecFetcher = "SpecFetcher",
    ConfigurationCollector = "ConfigurationCollector",
    ReviewActions = "ReviewActions",
    PromptSuggestion = "PromptSuggestion",
}

interface Segment {
    type: SegmentType;
    language?: string;
    loading: boolean;
    text: string;
    fileName?: string;
    command?: string;
    failed?: boolean;
    [key: string]: any;
}

function getCommand(command: string) {
    if (!command) {
        return "code";
    } else {
        return command.replaceAll(/"/g, "");
    }
}

export interface ActionButton {
    type: string;
    content: string;
}

/**
 * Parses <action_button> tags from the input string and extracts raw button data.
 * @param input The string to parse for action button tags
 * @returns A tuple containing an array of raw button data (type and content pairs) and the remaining text with tags removed
 */
function parseActionButtons(input: string): [ActionButton[], string] {
    const rawButtons: ActionButton[] = [];
    let remainingText = "";  // Start empty
    
    const actionButtonRegex = /<action_button\s+type="([^"]+)">([\s\S]*?)<\/action_button>/g;
    const matches = Array.from(input.matchAll(actionButtonRegex));

    let lastIndex = 0;
    for (const match of matches) {
        // Append text between last index and current match
        if (match.index! > lastIndex) {
            remainingText += input.slice(lastIndex, match.index);
        }
        
        const buttonType = match[1];
        const buttonContent = match[2].trim();
    
        rawButtons.push({
            type: buttonType,
            content: buttonContent,
        });
        
        lastIndex = match.index! + match[0].length;
    }
    
    // Append remaining text after last match
    if (lastIndex < input.length) {
        remainingText += input.slice(lastIndex);
    }
    
    return [rawButtons, remainingText];
}

function splitHalfGeneratedCode(content: string): Segment[] {
    const segments: Segment[] = [];
    // Regex to capture filename and optional test attribute
    // Using matchAll for stateless iteration to avoid regex lastIndex corruption during streaming
    const regexPattern = /<code\s+filename="([^"]+)"(?:\s+type=("test"|"ai_map"|"type_creator"))?>\s*```(\w+)\s*([\s\S]*?)$/g;

    // Convert to array to avoid stateful regex iteration issues
    const matches = Array.from(content.matchAll(regexPattern));
    let lastIndex = 0;

    for (const match of matches) {
        const [, fileName, type, language, code] = match;
        if (match.index! > lastIndex) {
            // Non-code segment before the current code block
            segments.push({
                type: SegmentType.Text,
                loading: false,
                text: content.slice(lastIndex, match.index),
                command: getCommand(type),
            });
        }

        // Code segment
        segments.push({
            type: SegmentType.Code,
            language: language,
            loading: true,
            text: code,
            fileName: fileName,
            command: getCommand(type),
        });

        lastIndex = match.index! + match[0].length;
    }

    if (lastIndex < content.length) {
        // Remaining non-code segment after the last code block
        segments.push({
            type: SegmentType.Text,
            loading: false,
            text: content.slice(lastIndex),
        });
    }

    return segments;
}

export function splitContent(content: string): Segment[] {
    const segments: Segment[] = [];

    // Combined regex to capture either <code ...>```<language> code ```</code> or <progress>Text</progress>
    // Using matchAll for stateless iteration to avoid regex lastIndex corruption during streaming
    const regexPattern =
        /<code\s+filename="([^"]+)"(?:\s+type=("test"|"ai_map"|"type_creator"))?>\s*```(\w+)\s*([\s\S]*?)```\s*<\/code>|<progress>([\s\S]*?)<\/progress>|<toolcall(?:\s+[^>]*)?>([\s\S]*?)<\/toolcall>|<toolresult(?:\s+[^>]*)?>([\s\S]*?)<\/toolresult>|<todo>([\s\S]*?)<\/todo>|<attachment>([\s\S]*?)<\/attachment>|<scenario>([\s\S]*?)<\/scenario>|<button\s+type="([^"]+)">([\s\S]*?)<\/button>|<inlineCode>([\s\S]*?)<inlineCode>|<references>([\s\S]*?)<references>|<connectorgenerator>([\s\S]*?)<\/connectorgenerator>|<reviewactions>([\s\S]*?)<\/reviewactions>|<configurationcollector>([\s\S]*?)<\/configurationcollector>/g;

    // Convert to array to avoid stateful regex iteration issues
    const matches = Array.from(content.matchAll(regexPattern));
    let lastIndex = 0;

    function updateLastProgressSegmentLoading(failed: boolean = false) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment && (lastSegment.type === SegmentType.Progress)) {
            lastSegment.loading = false;
            lastSegment.failed = failed;
        }
    }

    for (const match of matches) {
        // Handle text before the current match
        if (match.index > lastIndex) {
            updateLastProgressSegmentLoading();

            const textSegment = content.slice(lastIndex, match.index).replace(/<prompt_suggestion>[\s\S]*$/g, '');// Remove any trailing text after an unmatched <prompt_suggestion> to prevent it from being treated as normal text
            segments.push(...splitHalfGeneratedCode(textSegment));
        }

        if (match[1]) {
            // <code> block matched
            const fileName = match[1];
            const type = match[2];
            const language = match[3];
            const code = match[4];
            updateLastProgressSegmentLoading();
            segments.push({
                type: SegmentType.Code,
                loading: false,
                text: code,
                fileName: fileName,
                language: language,
                command: getCommand(type),
            });
        } else if (match[5]) {
            // <progress> block matched
            const progressText = match[5];

            updateLastProgressSegmentLoading();
            segments.push({
                type: SegmentType.Progress,
                loading: true,
                text: progressText,
            });
        } else if (match[6]) {
            // <toolcall> block matched
            const toolcallContent = match[6];
            const [actionButtons, toolcallText] = parseActionButtons(toolcallContent);
            updateLastProgressSegmentLoading();
            segments.push({
                type: SegmentType.ToolCall,
                loading: true,
                text: toolcallText,
                actionButtons: actionButtons,
            });
        } else if (match[7]) {
            // <toolresult> block matched
            const toolresultContent = match[7];
            const [actionButtons, toolresultText] = parseActionButtons(toolresultContent);

            updateLastProgressSegmentLoading();
            segments.push({
                type: SegmentType.ToolCall,
                loading: false,
                text: toolresultText,
                actionButtons: actionButtons,
            });
        } else if (match[8]) {
            // <todo> block matched
            const todoData = match[8];

            updateLastProgressSegmentLoading();
            try {
                const parsedData = JSON.parse(todoData);
                segments.push({
                    type: SegmentType.Todo,
                    loading: false,
                    text: "",
                    tasks: parsedData.tasks || [],
                    message: parsedData.message || ""
                });
            } catch (error) {
                // If parsing fails, show as text
                console.error("Failed to parse todo data:", error);
            }
        } else if (match[9]) {
            // <attachment> block matched
            const attachmentName = match[9].trim();

            updateLastProgressSegmentLoading();

            const existingAttachmentSegment = segments.find((segment) => segment.type === SegmentType.Attachment);

            if (existingAttachmentSegment) {
                existingAttachmentSegment.text += `, ${attachmentName}`;
            } else {
                segments.push({
                    type: SegmentType.Attachment,
                    loading: false,
                    text: attachmentName,
                });
            }
        } else if (match[10]) {
            // <scenario> block matched
            const scenarioContent = match[10].trim();

            updateLastProgressSegmentLoading(true);
            segments.push({
                type: SegmentType.TestScenario,
                loading: false,
                text: scenarioContent,
            });
        } else if (match[11]) {
            // <button> block matched
            const buttonType = match[11].trim();
            const buttonContent = match[12].trim();

            updateLastProgressSegmentLoading(true);
            segments.push({
                type: SegmentType.Button,
                loading: false,
                text: buttonContent,
                buttonType: buttonType,
            });
        } else if (match[13]) {
            segments.push({
                type: SegmentType.InlineCode,
                text: match[13].trim(),
                loading: false,
            });
        } else if (match[14]) {
            segments.push({
                type: SegmentType.References,
                text: match[14].trim(),
                loading: false,
            });
        } else if (match[15]) {
            // <connectorgenerator> block matched
            const connectorData = match[15];

            updateLastProgressSegmentLoading();
            try {
                const parsedData = JSON.parse(connectorData);
                segments.push({
                    type: SegmentType.SpecFetcher,
                    loading: false,
                    text: "",
                    specData: parsedData
                });
            } catch (error) {
                // If parsing fails, show as text
                console.error("Failed to parse connector generator data:", error);
            }
        } else if (match[16] !== undefined) {
            // <reviewactions> block matched
            updateLastProgressSegmentLoading();
            segments.push({
                type: SegmentType.ReviewActions,
                loading: false,
                text: "",
            });
        } else if (match[17]) {
            // <configurationcollector> block matched
            const configurationData = match[17];

            updateLastProgressSegmentLoading();
            try {
                const parsedData = JSON.parse(configurationData);
                segments.push({
                    type: SegmentType.ConfigurationCollector,
                    loading: false,
                    text: "",
                    configurationData: parsedData
                });
            } catch (error) {
                console.error("Failed to parse configuration collector data:", error);
            }
        }

        // Update lastIndex to the end of the current match
        lastIndex = match.index + match[0].length;
    }

    // Handle any remaining text after the last match
    if (lastIndex < content.length) {
        updateLastProgressSegmentLoading();

        const remainingText = content.slice(lastIndex).replace(/<prompt_suggestion>[\s\S]*$/g, '');// Remove any trailing text after an unmatched <prompt_suggestion> to prevent it from being treated as normal text
        segments.push(...splitHalfGeneratedCode(remainingText));
    }

    return segments;
}
