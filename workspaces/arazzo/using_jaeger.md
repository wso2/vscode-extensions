## First run the jeager application
docker run -d --name jaeger `  -e COLLECTOR_OTLP_ENABLED=true `  -p 16686:16686 `  -p 4318:4318 `  jaegertracing/all-in-one:latest      

## Build and call the CLI
.\arazzo-designer-cli.exe serve --otlp-endpoint http://localhost:4318 -f ..\examples\go-runner-test\toolshop\01-basic-sequential.arazzo.yaml