# API GROUP: Replacement (4 ops)

## GET /api/v1/participation/me/replacements
operationId: ReplacementController_own_v1  |  summary: -
Responses: 200: no-content

## POST /api/v1/sessions/{id}/participation/incidents/{incidentId}/replacement-preview
operationId: ReplacementController_prepare_v1  |  summary: -
Params: id in:path required string | incidentId in:path required string
Body (application/json): ReplacementPreviewDto = {}
Responses: 201: no-content

## GET /api/v1/sessions/{id}/participation/replacements/{commandId}
operationId: ReplacementController_get_v1  |  summary: -
Params: id in:path required string | commandId in:path required string
Responses: 200: no-content

## POST /api/v1/sessions/{id}/participation/replacements/{commandId}/approve
operationId: ReplacementController_approve_v1  |  summary: -
Params: id in:path required string | commandId in:path required string
Body (application/json): ReplacementApprovalDto = {}
Responses: 201: no-content
