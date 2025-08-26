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

export interface KeyValuePair {
    key: string;
    version: string;
}

export interface K8ConfigurationData {
    name: string;
    replicas: number;
    targetImage: string;
    ports: Array<{ port: number }>;
    hasEnvValues: boolean;
    hasPorts: boolean;
}

export function getKubernetesConfigurationTemplate() {
    return `---
apiVersion: "apps/v1"
kind: "Deployment"
metadata:
  name: "{{name}}-deployment"
spec:
  replicas: {{replicas}}
  selector:
    matchLabels:
      app: "integration"
  strategy:
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
    type: "RollingUpdate"
  template:
    metadata:
      labels:
        app: "integration"
    spec:
      containers:
      - name: "micro-integrator"
        image: "{{targetImage}}"
        imagePullPolicy: "Always"
        {{#hasPorts}}
        ports:
        {{#ports}}
            - containerPort: {{port}}
              protocol: "TCP"
        {{/ports}}
        {{/hasPorts}}
        {{#hasEnvValues}}
        envFrom:
        - configMapRef:
            name: "env-data"
        {{/hasEnvValues}}
---
apiVersion: "v1"
kind: "Service"
metadata:
  name: "{{name}}-service"
spec:
  type: "ClusterIP"
  selector:
    app: "integration"
  ports:
  {{#ports}}
    - name: "{{name}}-inboundport-{{port}}"
      port: {{port}}
      targetPort: {{port}}
  {{/ports}}
    - name: "{{name}}-management-http-port"
      port: 9201
      targetPort: 9201
    - name: "{{name}}-pt-httpsport"
      port: 8253
      targetPort: 8253
    - name: "{{name}}-pt-httpport"
      port: 8290
      targetPort: 8290
    - name: "{{name}}-management-https-port"
      port: 9164
      targetPort: 9164
`;
}

export function getKubernetesDataConfigurationTemplate() {
    return `---
apiVersion: "v1"
kind: "ConfigMap"
metadata:
  name: "env-data"
data:
  {{#envValues}}
    {{key}}: "{{value}}"
  {{/envValues}}
`;
}

export function getKubernetesDataConfiguration(data: KeyValuePair[]) {
    return render(getKubernetesDataConfigurationTemplate(), { envValues: data });
}

export function getKubernetesConfiguration(data: K8ConfigurationData) {
    return render(getKubernetesConfigurationTemplate(), data);
}
