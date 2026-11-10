# ipaas-service OpenAPI document

`ipaas-openapi.yaml` is a copy of the Integration Platform API's OpenAPI document
(`ipaas-service/openapi/openapi.yaml` in the platform's repository). It is the
source of `src/api/generated/ipaas.ts`, produced by `pnpm generate`
(openapi-typescript 7, types only; no runtime code is generated).

Local patches to the copy are marked `PATCH (wso2-cloud-client)` inside the
document and listed here, so they can be sent upstream and dropped:

- `components.parameters.traceId`, `traceStartTime`, `traceEndTime`: referenced
  by the three `/traces` routes but never declared upstream.
- `PolicyRules.operations.example`: removed; its `allOf`/`anyOf` keys inside an
  example value are read as schema combinators by openapi-typescript.
