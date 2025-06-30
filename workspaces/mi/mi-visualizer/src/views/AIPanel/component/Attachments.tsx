import React from "react";

import { FlexRow } from "../styles";
import { FileObject, ImageObject } from '@wso2/mi-core';import { getFileIcon } from "../utils";
import { Button, Codicon } from "@wso2/ui-toolkit";

interface AttachmentProps {
    attachments: FileObject[] | ImageObject[];
    setAttachments?: Function;
    nameAttribute: string;
    addControls?: boolean;
}

const Attachments: React.FC<AttachmentProps> = ({ attachments, nameAttribute, addControls, setAttachments}) => {
    const handleRemove = (index: number) => {
        if (nameAttribute === "name") {
            setAttachments((prevFiles: FileObject[]) => prevFiles.filter((_: FileObject, i: number) => i !== index));
        } else if (nameAttribute === "imageName") {
            setAttachments((prevImages: ImageObject[]) => prevImages.filter((_: ImageObject, i: number) => i !== index));
        }
    };

    const getAttachmentName = (attachment: any): string => {
        if (nameAttribute === "name") {
            return attachment.name;
        } else if (nameAttribute === "imageName") {
            return attachment.imageName;
        }
        return "";
    };

    return (
        <FlexRow style={{ flexWrap: "wrap", gap: "2px", marginBottom: "2px"}}>
            {attachments.map((attachment, index) => (
                <FlexRow
                    key={index}
                    style={{
                        alignItems: "center",
                        backgroundColor: "var(--vscode-input-background)",
                        padding: "2px 5px",
                        borderRadius: "4px",
                        border: "1px solid var(--vscode-editorGroup-border)",
                    }}
                >
                    <Codicon name={getFileIcon(getAttachmentName(attachment))} />
                    <span
                        style={{
                            color: "var(--vscode-editor-foreground)",
                            margin: "5px",
                            fontSize: "10px",
                        }}
                    >
                        {getAttachmentName(attachment)}
                    </span>
                    {addControls && (
                        <Button
                            appearance="icon"
                            onClick={() => {
                                handleRemove(index);
                            }}
                        >
                            <Codicon name="close" />
                        </Button>
                    )}
                </FlexRow>
            ))}
        </FlexRow>
    );
};

export default Attachments;
