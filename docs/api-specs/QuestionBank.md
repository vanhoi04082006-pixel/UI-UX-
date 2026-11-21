# API GROUP: QuestionBank (5 ops)

## GET /api/v1/admin/question-bank
operationId: QuestionBankController_list_v1  |  summary: -
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## POST /api/v1/admin/question-bank
operationId: QuestionBankController_create_v1  |  summary: -
Body (application/json): QuestionContentDto = {}
Responses: 201: no-content

## DELETE /api/v1/admin/question-bank/{id}
operationId: QuestionBankController_retire_v1  |  summary: -
Params: id in:path required string | version in:query required number
Responses: 200: no-content

## GET /api/v1/admin/question-bank/{id}
operationId: QuestionBankController_get_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## PUT /api/v1/admin/question-bank/{id}
operationId: QuestionBankController_update_v1  |  summary: -
Params: id in:path required string
Body (application/json): UpdateQuestionDto = {}
Responses: 200: no-content
