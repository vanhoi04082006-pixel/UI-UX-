# API GROUP: Applications (8 ops)

## POST /api/v1/applications
operationId: ApplicationsController_apply_v1  |  summary: -
Body (application/json): ApplyDto = {}
Responses: 201: no-content

## POST /api/v1/applications/leave
operationId: ApplicationsController_leave_v1  |  summary: -
Responses: 201: no-content

## GET /api/v1/applications/me
operationId: ApplicationsController_me_v1  |  summary: -
Responses: 200: no-content

## GET /api/v1/applications/me/cv
operationId: ApplicationsController_cv_v1  |  summary: -
Responses: 200: no-content

## POST /api/v1/applications/me/cv
operationId: ApplicationsController_supplement_v1  |  summary: -
Responses: 201: no-content

## POST /api/v1/applications/request-access
operationId: ApplicationsController_access_v1  |  summary: -
Body (application/json): AccessRequestDto = {}
Responses: 201: no-content

## GET /api/v1/applications/rounds
operationId: ApplicationsController_roundsList_v1  |  summary: -
Responses: 200: no-content

## POST /api/v1/applications/verify
operationId: ApplicationsController_verify_v1  |  summary: -
Body (application/json): VerifyApplicationDto = {}
Responses: 201: no-content
