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

export function getRegistryResource(type: string, resourceName: string) {
    switch (type) {
        case "WSDL File":
            return getWSDLFileTemplate();
        case "WS-Policy":
            return getWSPolicyTemplate();
        case "XSD File":
            return getXSDTemplate();
        case "XSLT File":
        case "XSL File":
            return getXSLTemplate();
    }
}

export function getWSDLFileTemplate() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <wsdl:definitions xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
        xmlns:tns="http://www.example.org/NewWSDLFile/" xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
        xmlns:xsd="http://www.w3.org/2001/XMLSchema" name="NewWSDLFile"
        targetNamespace="http://www.example.org/NewWSDLFile/">
        <wsdl:types>
            <xsd:schema targetNamespace="http://www.example.org/NewWSDLFile/">
                <xsd:element name="NewOperation">
                    <xsd:complexType>
                        <xsd:sequence>
                            <xsd:element name="in" type="xsd:string" />
                        </xsd:sequence>
                    </xsd:complexType>
                </xsd:element>
                <xsd:element name="NewOperationResponse">
                    <xsd:complexType>
                        <xsd:sequence>
                            <xsd:element name="out" type="xsd:string" />
                        </xsd:sequence>
                    </xsd:complexType>
                </xsd:element>
            </xsd:schema>
        </wsdl:types>
        <wsdl:message name="NewOperationRequest">
            <wsdl:part element="tns:NewOperation" name="parameters" />
        </wsdl:message>
        <wsdl:message name="NewOperationResponse">
            <wsdl:part element="tns:NewOperationResponse" name="parameters" />
        </wsdl:message>
        <wsdl:portType name="NewWSDLFile">
            <wsdl:operation name="NewOperation">
                <wsdl:input message="tns:NewOperationRequest" />
                <wsdl:output message="tns:NewOperationResponse" />
            </wsdl:operation>
        </wsdl:portType>
        <wsdl:binding name="NewWSDLFileSOAP" type="tns:NewWSDLFile">
            <soap:binding style="document"
                transport="http://schemas.xmlsoap.org/soap/http" />
            <wsdl:operation name="NewOperation">
                <soap:operation soapAction="http://www.example.org/NewWSDLFile/NewOperation" />
                <wsdl:input>
                    <soap:body use="literal" />
                </wsdl:input>
                <wsdl:output>
                    <soap:body use="literal" />
                </wsdl:output>
            </wsdl:operation>
        </wsdl:binding>
        <wsdl:service name="wsdl">
            <wsdl:port binding="tns:NewWSDLFileSOAP" name="wsdlSOAP">
                <soap:address location="http://www.example.org/" />
            </wsdl:port>
        </wsdl:service>
    </wsdl:definitions>`;
}

function getWSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="UTOverTransport"
	xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
	xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy">
	<wsp:ExactlyOne>
		<wsp:All>
			<sp:TransportBinding
				xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
				<wsp:Policy>
					<sp:TransportToken>
						<wsp:Policy>
							<sp:HttpsToken RequireClientCertificate="false" />
						</wsp:Policy>
					</sp:TransportToken>
					<sp:AlgorithmSuite>
						<wsp:Policy>
							<sp:Basic256 />
						</wsp:Policy>
					</sp:AlgorithmSuite>
					<sp:Layout>
						<wsp:Policy>
							<sp:Lax />
						</wsp:Policy>
					</sp:Layout>
					<sp:IncludeTimestamp />
				</wsp:Policy>
			</sp:TransportBinding>
			<sp:SignedSupportingTokens
				xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
				<wsp:Policy>
					<sp:UsernameToken
						sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/AlwaysToRecipient" />
				</wsp:Policy>
			</sp:SignedSupportingTokens>
		</wsp:All>
	</wsp:ExactlyOne>
	<rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
		<rampart:user>wso2carbon</rampart:user>
		<rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
		<rampart:timestampPrecisionInMilliseconds>true
		</rampart:timestampPrecisionInMilliseconds>
		<rampart:timestampTTL>300</rampart:timestampTTL>
		<rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
		<rampart:timestampStrict>false</rampart:timestampStrict>
		<rampart:tokenStoreClass>org.wso2.carbon.security.util.SecurityTokenStore
		</rampart:tokenStoreClass>
		<rampart:nonceLifeTime>300</rampart:nonceLifeTime>
	</rampart:RampartConfig>
	<sec:CarbonSecConfig xmlns:sec="http://www.wso2.org/products/carbon/security">
		<sec:Authorization>
			<sec:property name="org.wso2.carbon.security.allowedroles"></sec:property>
		</sec:Authorization>
	</sec:CarbonSecConfig>
</wsp:Policy>`;
}

function getXSDTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
    <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
    </xs:schema>`;
}

function getXSLTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
    <xsl:stylesheet version="1.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
            <!-- TODO: Auto-generated template -->
        </xsl:template>
    </xsl:stylesheet>`;
}
