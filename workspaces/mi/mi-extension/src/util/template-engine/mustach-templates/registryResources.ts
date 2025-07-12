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

import { render } from "mustache";

export function getRegistryResource(type: string, resourceName: string, roles: string | undefined) {
    switch (type) {
        case "WSDL File":
            return getWSDLFileTemplate();
        case "WS-Policy":
            return getWSPolicyTemplate();
        case "Username Token":
            return render(getUsernameTokenWSPolicyTemplate(), roles);
        case "Non-repudiation":
            return getNonRepudiationWSPolicyTemplate();
        case "Integrity":
            return getIntegrityWSPolicyTemplate();
        case "Confidentiality":
            return getConfidentialityWSPolicyTemplate();
        case "Sign and Encrypt - X509 Authentication":
            return getSignX509WSPolicyTemplate();
        case "Sign and Encrypt - Anonymous Clients":
            return getSignAnonymousWSPolicyTemplate();
        case "Encrypt Only - Username Token Authentication":
            return render(getEncryptUsernameWSPolicyTemplate(), roles);
        case "Sign and Encrypt - Username Token Authentication":
            return render(getSignUsernameWSPolicyTemplate(), roles);
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
		<rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
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

function getUsernameTokenWSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="UTOverTransport" xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsp:ExactlyOne>
        <wsp:All>
            <sp:TransportBinding xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <wsp:Policy>
                    <sp:TransportToken>
                        <wsp:Policy>
                            <sp:HttpsToken RequireClientCertificate="false"/>
                        </wsp:Policy>
                    </sp:TransportToken>
                    <sp:AlgorithmSuite>
                        <wsp:Policy>
                            <sp:Basic256/>
                        </wsp:Policy>
                    </sp:AlgorithmSuite>
                    <sp:Layout>
                        <wsp:Policy>
                            <sp:Lax/>
                        </wsp:Policy>
                    </sp:Layout>
                    <sp:IncludeTimestamp/>
                </wsp:Policy>
            </sp:TransportBinding>
            <sp:SignedSupportingTokens xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <wsp:Policy>
                    <sp:UsernameToken sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/AlwaysToRecipient"/>
                </wsp:Policy>
            </sp:SignedSupportingTokens>
        </wsp:All>
    </wsp:ExactlyOne>
    <rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
        <rampart:user>wso2carbon</rampart:user>
        <rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
        <rampart:timestampPrecisionInMilliseconds>true</rampart:timestampPrecisionInMilliseconds>
        <rampart:timestampTTL>300</rampart:timestampTTL>
        <rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
        <rampart:timestampStrict>false</rampart:timestampStrict>
        <rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
        <rampart:nonceLifeTime>300</rampart:nonceLifeTime>
    </rampart:RampartConfig>
{{#.}}
    <sec:CarbonSecConfig xmlns:sec="http://www.wso2.org/products/carbon/security">
        <sec:Authorization>
            <sec:property name="org.wso2.carbon.security.allowedroles">{{.}}</sec:property>
        </sec:Authorization>
    </sec:CarbonSecConfig>
{{/.}}</wsp:Policy>`;
}

function getNonRepudiationWSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="SigOnly" xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsp:ExactlyOne>
        <wsp:All>
            <sp:AsymmetricBinding xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <wsp:Policy>
                    <sp:InitiatorToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/AlwaysToRecipient">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                    <!-- sp:WssX509V3Token10/ -->
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:InitiatorToken>
                    <sp:RecipientToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/Never">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                    <!-- sp:WssX509V3Token10/ -->
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:RecipientToken>
                    <sp:AlgorithmSuite>
                        <wsp:Policy>
                            <sp:Basic256/>
                        </wsp:Policy>
                    </sp:AlgorithmSuite>
                    <sp:Layout>
                        <wsp:Policy>
                            <sp:Strict/>
                        </wsp:Policy>
                    </sp:Layout>
                    <sp:IncludeTimestamp/>
                    <sp:OnlySignEntireHeadersAndBody/>
                </wsp:Policy>
            </sp:AsymmetricBinding>
            <sp:Wss10 xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <wsp:Policy>
                    <sp:MustSupportRefKeyIdentifier/>
                    <sp:MustSupportRefIssuerSerial/>
                </wsp:Policy>
            </sp:Wss10>
            <sp:SignedParts xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <sp:Body/>
            </sp:SignedParts>
        </wsp:All>
    </wsp:ExactlyOne>
    <rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
        <rampart:user>wso2carbon</rampart:user>
        <rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
        <rampart:timestampPrecisionInMilliseconds>true</rampart:timestampPrecisionInMilliseconds>
        <rampart:timestampTTL>300</rampart:timestampTTL>
        <rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
        <rampart:timestampStrict>false</rampart:timestampStrict>
        <rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
        <rampart:nonceLifeTime>300</rampart:nonceLifeTime>
        <rampart:encryptionCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:encryptionCrypto>
        <rampart:signatureCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:signatureCrypto>
    </rampart:RampartConfig>
</wsp:Policy>`;
}

function getIntegrityWSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="SgnOnlyAnonymous" xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsp:ExactlyOne>
        <wsp:All>
            <sp:SymmetricBinding>
                <wsp:Policy>
                    <sp:ProtectionToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/Never">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:ProtectionToken>
                    <sp:AlgorithmSuite>
                        <wsp:Policy>
                            <sp:Basic256/>
                        </wsp:Policy>
                    </sp:AlgorithmSuite>
                    <sp:Layout>
                        <wsp:Policy>
                            <sp:Lax/>
                        </wsp:Policy>
                    </sp:Layout>
                    <sp:IncludeTimestamp/>
                    <sp:OnlySignEntireHeadersAndBody/>
                </wsp:Policy>
            </sp:SymmetricBinding>
            <sp:SignedParts>
                <sp:Body/>
            </sp:SignedParts>
            <sp:Wss11>
                <wsp:Policy>
                    <sp:MustSupportRefKeyIdentifier/>
                    <sp:MustSupportRefIssuerSerial/>
                    <sp:MustSupportRefThumbprint/>
                    <sp:MustSupportRefEncryptedKey/>
                    <sp:RequireSignatureConfirmation/>
                </wsp:Policy>
            </sp:Wss11>
            <sp:Trust10>
                <wsp:Policy>
                    <sp:MustSupportIssuedTokens/>
                    <sp:RequireClientEntropy/>
                    <sp:RequireServerEntropy/>
                </wsp:Policy>
            </sp:Trust10>
        </wsp:All>
    </wsp:ExactlyOne>
    <rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
        <rampart:user>wso2carbon</rampart:user>
        <rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
        <rampart:timestampPrecisionInMilliseconds>true</rampart:timestampPrecisionInMilliseconds>
        <rampart:timestampTTL>300</rampart:timestampTTL>
        <rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
        <rampart:timestampStrict>false</rampart:timestampStrict>
        <rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
        <rampart:nonceLifeTime>300</rampart:nonceLifeTime>
        <rampart:encryptionCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:encryptionCrypto>
        <rampart:signatureCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:signatureCrypto>
    </rampart:RampartConfig>
</wsp:Policy>`;
}

function getConfidentialityWSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="EncrOnlyAnonymous" xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsp:ExactlyOne>
        <wsp:All>
            <sp:SymmetricBinding>
                <wsp:Policy>
                    <sp:ProtectionToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/Never">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:ProtectionToken>
                    <sp:AlgorithmSuite>
                        <wsp:Policy>
                            <sp:Basic256/>
                        </wsp:Policy>
                    </sp:AlgorithmSuite>
                    <sp:Layout>
                        <wsp:Policy>
                            <sp:Lax/>
                        </wsp:Policy>
                    </sp:Layout>
                    <sp:IncludeTimestamp/>
                    <sp:OnlySignEntireHeadersAndBody/>
                </wsp:Policy>
            </sp:SymmetricBinding>
            <sp:EncryptedParts>
                <sp:Body/>
            </sp:EncryptedParts>
            <sp:Wss11>
                <wsp:Policy>
                    <sp:MustSupportRefKeyIdentifier/>
                    <sp:MustSupportRefIssuerSerial/>
                    <sp:MustSupportRefThumbprint/>
                    <sp:MustSupportRefEncryptedKey/>
                    <sp:RequireSignatureConfirmation/>
                </wsp:Policy>
            </sp:Wss11>
            <sp:Trust10>
                <wsp:Policy>
                    <sp:MustSupportIssuedTokens/>
                    <sp:RequireClientEntropy/>
                    <sp:RequireServerEntropy/>
                </wsp:Policy>
            </sp:Trust10>
        </wsp:All>
    </wsp:ExactlyOne>
    <rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
        <rampart:user>wso2carbon</rampart:user>
        <rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
        <rampart:timestampPrecisionInMilliseconds>true</rampart:timestampPrecisionInMilliseconds>
        <rampart:timestampTTL>300</rampart:timestampTTL>
        <rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
        <rampart:timestampStrict>false</rampart:timestampStrict>
        <rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
        <rampart:nonceLifeTime>300</rampart:nonceLifeTime>
        <rampart:encryptionCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:encryptionCrypto>
        <rampart:signatureCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:signatureCrypto>
    </rampart:RampartConfig>
</wsp:Policy>`;
}

function getSignX509WSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="SigEncr" xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsp:ExactlyOne>
        <wsp:All>
            <sp:AsymmetricBinding xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <wsp:Policy>
                    <sp:InitiatorToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/AlwaysToRecipient">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:InitiatorToken>
                    <sp:RecipientToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/Never">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:RecipientToken>
                    <sp:AlgorithmSuite>
                        <wsp:Policy>
                            <sp:Basic256/>
                        </wsp:Policy>
                    </sp:AlgorithmSuite>
                    <sp:Layout>
                        <wsp:Policy>
                            <sp:Strict/>
                        </wsp:Policy>
                    </sp:Layout>
                    <sp:IncludeTimestamp/>
                    <sp:OnlySignEntireHeadersAndBody/>
                </wsp:Policy>
            </sp:AsymmetricBinding>
            <sp:Wss11 xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <wsp:Policy>
                    <sp:MustSupportRefKeyIdentifier/>
                    <sp:MustSupportRefIssuerSerial/>
                    <sp:MustSupportRefThumbprint/>
                    <sp:MustSupportRefEncryptedKey/>
                    <sp:RequireSignatureConfirmation/>
                </wsp:Policy>
            </sp:Wss11>
            <sp:Wss10 xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <wsp:Policy>
                    <sp:MustSupportRefKeyIdentifier/>
                    <sp:MustSupportRefIssuerSerial/>
                </wsp:Policy>
            </sp:Wss10>
            <sp:SignedParts xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <sp:Body/>
            </sp:SignedParts>
            <sp:EncryptedParts xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy">
                <sp:Body/>
            </sp:EncryptedParts>
        </wsp:All>
    </wsp:ExactlyOne>
    <rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
        <rampart:user>wso2carbon</rampart:user>
        <rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
        <rampart:timestampPrecisionInMilliseconds>true</rampart:timestampPrecisionInMilliseconds>
        <rampart:timestampTTL>300</rampart:timestampTTL>
        <rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
        <rampart:timestampStrict>false</rampart:timestampStrict>
        <rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
        <rampart:nonceLifeTime>300</rampart:nonceLifeTime>
        <rampart:encryptionCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:encryptionCrypto>
        <rampart:signatureCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:signatureCrypto>
    </rampart:RampartConfig>
</wsp:Policy>`;
}

function getSignAnonymousWSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="SgnEncrAnonymous" xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsp:ExactlyOne>
        <wsp:All>
            <sp:SymmetricBinding>
                <wsp:Policy>
                    <sp:ProtectionToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/Never">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:ProtectionToken>
                    <sp:AlgorithmSuite>
                        <wsp:Policy>
                            <sp:Basic256/>
                        </wsp:Policy>
                    </sp:AlgorithmSuite>
                    <sp:Layout>
                        <wsp:Policy>
                            <sp:Lax/>
                        </wsp:Policy>
                    </sp:Layout>
                    <sp:IncludeTimestamp/>
                    <sp:OnlySignEntireHeadersAndBody/>
                </wsp:Policy>
            </sp:SymmetricBinding>
            <sp:SignedParts>
                <sp:Body/>
            </sp:SignedParts>
            <sp:EncryptedParts>
                <sp:Body/>
            </sp:EncryptedParts>
            <sp:Wss11>
                <wsp:Policy>
                    <sp:MustSupportRefKeyIdentifier/>
                    <sp:MustSupportRefIssuerSerial/>
                    <sp:MustSupportRefThumbprint/>
                    <sp:MustSupportRefEncryptedKey/>
                    <sp:RequireSignatureConfirmation/>
                </wsp:Policy>
            </sp:Wss11>
            <sp:Trust10>
                <wsp:Policy>
                    <sp:MustSupportIssuedTokens/>
                    <sp:RequireClientEntropy/>
                    <sp:RequireServerEntropy/>
                </wsp:Policy>
            </sp:Trust10>
        </wsp:All>
    </wsp:ExactlyOne>
    <rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
        <rampart:user>wso2carbon</rampart:user>
        <rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
        <rampart:timestampPrecisionInMilliseconds>true</rampart:timestampPrecisionInMilliseconds>
        <rampart:timestampTTL>300</rampart:timestampTTL>
        <rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
        <rampart:timestampStrict>false</rampart:timestampStrict>
        <rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
        <rampart:nonceLifeTime>300</rampart:nonceLifeTime>
        <rampart:encryptionCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:encryptionCrypto>
        <rampart:signatureCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:signatureCrypto>
    </rampart:RampartConfig>
</wsp:Policy>`;
}

function getEncryptUsernameWSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="EncrOnlyUsername" xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsp:ExactlyOne>
        <wsp:All>
            <sp:SymmetricBinding>
                <wsp:Policy>
                    <sp:ProtectionToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/Never">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:ProtectionToken>
                    <sp:AlgorithmSuite>
                        <wsp:Policy>
                            <sp:Basic256/>
                        </wsp:Policy>
                    </sp:AlgorithmSuite>
                    <sp:Layout>
                        <wsp:Policy>
                            <sp:Lax/>
                        </wsp:Policy>
                    </sp:Layout>
                    <sp:IncludeTimestamp/>
                    <sp:OnlySignEntireHeadersAndBody/>
                </wsp:Policy>
            </sp:SymmetricBinding>
            <sp:EncryptedParts>
                <sp:Body/>
            </sp:EncryptedParts>
            <sp:SignedSupportingTokens>
                <wsp:Policy>
                    <sp:UsernameToken sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/AlwaysToRecipient">
                        <wsp:Policy>
                            <sp:WssUsernameToken10/>
                        </wsp:Policy>
                    </sp:UsernameToken>
                </wsp:Policy>
            </sp:SignedSupportingTokens>
            <sp:Wss11>
                <wsp:Policy>
                    <sp:MustSupportRefKeyIdentifier/>
                    <sp:MustSupportRefIssuerSerial/>
                    <sp:MustSupportRefThumbprint/>
                    <sp:MustSupportRefEncryptedKey/>
                    <sp:RequireSignatureConfirmation/>
                </wsp:Policy>
            </sp:Wss11>
            <sp:Trust10>
                <wsp:Policy>
                    <sp:MustSupportIssuedTokens/>
                    <sp:RequireClientEntropy/>
                    <sp:RequireServerEntropy/>
                </wsp:Policy>
            </sp:Trust10>
        </wsp:All>
    </wsp:ExactlyOne>
    <rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
        <rampart:user>wso2carbon</rampart:user>
        <rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
        <rampart:timestampPrecisionInMilliseconds>true</rampart:timestampPrecisionInMilliseconds>
        <rampart:timestampTTL>300</rampart:timestampTTL>
        <rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
        <rampart:timestampStrict>false</rampart:timestampStrict>
        <rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
        <rampart:nonceLifeTime>300</rampart:nonceLifeTime>
        <rampart:encryptionCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:encryptionCrypto>
        <rampart:signatureCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:signatureCrypto>
    </rampart:RampartConfig>
{{#.}}
    <sec:CarbonSecConfig xmlns:sec="http://www.wso2.org/products/carbon/security">
        <sec:Authorization>
            <sec:property name="org.wso2.carbon.security.allowedroles">{{.}}</sec:property>
        </sec:Authorization>
    </sec:CarbonSecConfig>
{{/.}}</wsp:Policy>
`;
}

function getSignUsernameWSPolicyTemplate() {
    return `<wsp:Policy wsu:Id="SgnEncrUsername" xmlns:sp="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <wsp:ExactlyOne>
        <wsp:All>
            <sp:SymmetricBinding>
                <wsp:Policy>
                    <sp:ProtectionToken>
                        <wsp:Policy>
                            <sp:X509Token sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/Never">
                                <wsp:Policy>
                                    <sp:RequireThumbprintReference/>
                                    <sp:WssX509V3Token10/>
                                </wsp:Policy>
                            </sp:X509Token>
                        </wsp:Policy>
                    </sp:ProtectionToken>
                    <sp:AlgorithmSuite>
                        <wsp:Policy>
                            <sp:Basic256/>
                        </wsp:Policy>
                    </sp:AlgorithmSuite>
                    <sp:Layout>
                        <wsp:Policy>
                            <sp:Lax/>
                        </wsp:Policy>
                    </sp:Layout>
                    <sp:IncludeTimestamp/>
                    <sp:OnlySignEntireHeadersAndBody/>
                </wsp:Policy>
            </sp:SymmetricBinding>
            <sp:SignedParts>
                <sp:Body/>
            </sp:SignedParts>
            <sp:EncryptedParts>
                <sp:Body/>
            </sp:EncryptedParts>
            <sp:SignedSupportingTokens>
                <wsp:Policy>
                    <sp:UsernameToken sp:IncludeToken="http://schemas.xmlsoap.org/ws/2005/07/securitypolicy/IncludeToken/AlwaysToRecipient">
                        <wsp:Policy>
                            <sp:WssUsernameToken10/>
                        </wsp:Policy>
                    </sp:UsernameToken>
                </wsp:Policy>
            </sp:SignedSupportingTokens>
            <sp:Wss11>
                <wsp:Policy>
                    <sp:MustSupportRefKeyIdentifier/>
                    <sp:MustSupportRefIssuerSerial/>
                    <sp:MustSupportRefThumbprint/>
                    <sp:MustSupportRefEncryptedKey/>
                    <sp:RequireSignatureConfirmation/>
                </wsp:Policy>
            </sp:Wss11>
            <sp:Trust10>
                <wsp:Policy>
                    <sp:MustSupportIssuedTokens/>
                    <sp:RequireClientEntropy/>
                    <sp:RequireServerEntropy/>
                </wsp:Policy>
            </sp:Trust10>
        </wsp:All>
    </wsp:ExactlyOne>
    <rampart:RampartConfig xmlns:rampart="http://ws.apache.org/rampart/policy">
        <rampart:user>wso2carbon</rampart:user>
        <rampart:encryptionUser>useReqSigCert</rampart:encryptionUser>
        <rampart:timestampPrecisionInMilliseconds>true</rampart:timestampPrecisionInMilliseconds>
        <rampart:timestampTTL>300</rampart:timestampTTL>
        <rampart:timestampMaxSkew>300</rampart:timestampMaxSkew>
        <rampart:timestampStrict>false</rampart:timestampStrict>
        <rampart:tokenStoreClass>org.wso2.micro.integrator.security.extensions.SecurityTokenStore</rampart:tokenStoreClass>
        <rampart:nonceLifeTime>300</rampart:nonceLifeTime>
        <rampart:encryptionCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:encryptionCrypto>
        <rampart:signatureCrypto>
            <rampart:crypto cryptoKey="org.wso2.carbon.security.crypto.privatestore" provider="org.wso2.micro.integrator.security.util.ServerCrypto">
                <rampart:property name="org.wso2.carbon.security.crypto.alias">wso2carbon</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.privatestore">wso2carbon.jks</rampart:property>
                <rampart:property name="org.wso2.stratos.tenant.id">-1234</rampart:property>
                <rampart:property name="org.wso2.carbon.security.crypto.truststores">wso2carbon.jks</rampart:property>
                <rampart:property name="rampart.config.user">wso2carbon</rampart:property>
            </rampart:crypto>
        </rampart:signatureCrypto>
    </rampart:RampartConfig>
{{#.}}
    <sec:CarbonSecConfig xmlns:sec="http://www.wso2.org/products/carbon/security">
        <sec:Authorization>
            <sec:property name="org.wso2.carbon.security.allowedroles">{{.}}</sec:property>
        </sec:Authorization>
    </sec:CarbonSecConfig>
{{/.}}</wsp:Policy>`;
}
