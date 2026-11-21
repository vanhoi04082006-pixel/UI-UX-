# API GROUP: AdminSystem (4 ops)

## GET /api/v1/admin/system/contracts
operationId: AdminSystemController_contracts_v1  |  summary: -
Responses: 200: no-content

## POST /api/v1/admin/system/contracts/validate
operationId: AdminSystemController_validate_v1  |  summary: -
Body (application/json): ContractDraftDto = {}
Responses: 201: no-content

## GET /api/v1/admin/system/repositories
operationId: AdminSystemController_repositories_v1  |  summary: -
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/admin/system/status
operationId: AdminSystemController_status_v1  |  summary: -
Responses: 200: no-content
