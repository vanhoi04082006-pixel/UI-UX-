# API GROUP: Participation (7 ops)

## GET /api/v1/participation/me
operationId: ParticipationController_own_v1  |  summary: -
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/sessions/{id}/participation
operationId: ParticipationController_report_v1  |  summary: -
Params: id in:path required string | page in:query number | pageSize in:query number
Responses: 200: no-content

## POST /api/v1/sessions/{id}/participation/incidents/{incidentId}/replacement-advice
operationId: ParticipationController_adviseReplacement_v1  |  summary: -
Params: id in:path required string | incidentId in:path required string
Responses: 201: no-content

## POST /api/v1/sessions/{id}/participation/incidents/{incidentId}/resolve
operationId: ParticipationController_resolve_v1  |  summary: -
Params: id in:path required string | incidentId in:path required string
Body (application/json): ParticipationResolveDto = {}
Responses: 201: no-content

## POST /api/v1/sessions/{id}/participation/policy
operationId: ParticipationController_savePolicy_v1  |  summary: -
Params: id in:path required string
Body (application/json): ParticipationPolicyDto = {}
Responses: 201: no-content

## POST /api/v1/sessions/{id}/participation/refresh
operationId: ParticipationController_refresh_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/sessions/{id}/participation/tasks/{taskId}/extend
operationId: ParticipationController_extend_v1  |  summary: -
Params: id in:path required string | taskId in:path required string
Body (application/json): ParticipationExtensionDto = {}
Responses: 201: no-content
