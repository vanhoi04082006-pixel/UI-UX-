# API GROUP: Communications (3 ops)

## GET /api/v1/admin/communications
operationId: CommunicationsController_list_v1  |  summary: -
Responses: 200: no-content

## GET /api/v1/admin/communications/{id}/preview
operationId: CommunicationsController_preview_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/admin/communications/{id}/resend
operationId: CommunicationsController_resend_v1  |  summary: -
Params: id in:path required string
Body (application/json): ResendMail = {}
Responses: 201: no-content
