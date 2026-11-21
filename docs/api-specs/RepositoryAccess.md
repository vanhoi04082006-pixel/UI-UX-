# API GROUP: RepositoryAccess (3 ops)

## GET /api/v1/github/me/repository-access
operationId: RepositoryAccessController_own_v1  |  summary: -
Responses: 200: no-content

## GET /api/v1/sessions/{id}/participation/repository-access-jobs
operationId: RepositoryAccessController_report_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/sessions/{id}/participation/repository-access-jobs/{jobId}/retry
operationId: RepositoryAccessController_retry_v1  |  summary: -
Params: id in:path required string | jobId in:path required string
Body (application/json): RepositoryAccessRetryDto = {}
Responses: 201: no-content
