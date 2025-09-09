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

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = require('./pdf.worker.mjs');
 
interface PdfViewerProps {
    base64String: string;
}

export function PdfViewer({ base64String }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
        setNumPages(numPages);
    };

    return (
        <Document
            file={base64String}
            onLoadSuccess={onDocumentLoadSuccess}
        >
            {numPages &&
                Array.from(new Array(numPages), (el, index) => (
                    <Page key={`page_${index + 1}`} pageNumber={index + 1} />
                ))}
        </Document>
    );
}

