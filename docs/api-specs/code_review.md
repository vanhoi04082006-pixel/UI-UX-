# API GROUP: code review (2 ops)

## GET /api/v1/submissions/{id}/code-reviews
operationId: CodeReviewController_list_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/submissions/{id}/code-reviews
operationId: CodeReviewController_run_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content
