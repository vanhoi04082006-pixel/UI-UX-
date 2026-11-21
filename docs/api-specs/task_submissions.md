# API GROUP: task submissions (4 ops)

## POST /api/v1/submissions/{id}/review
operationId: SubmissionsController_review_v1  |  summary: -
Params: id in:path required string
Body (application/json): ReviewSubmissionDto = {}
Responses: 201: no-content

## POST /api/v1/submissions/{id}/withdraw
operationId: SubmissionsController_withdraw_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content

## GET /api/v1/tasks/{id}/submissions
operationId: SubmissionsController_list_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/tasks/{id}/submissions
operationId: SubmissionsController_submit_v1  |  summary: -
Params: id in:path required string
Body (application/json): SubmitTaskDto = {}
Responses: 201: no-content
