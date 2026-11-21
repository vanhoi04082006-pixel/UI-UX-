# API GROUP: evaluation-cycles (9 ops)

## GET /api/v1/evaluation-cycles
operationId: EvaluationCyclesController_list_v1  |  summary: List evaluation cycles (evaluations.view; filters: status/sessionId/projectId)
Params: page in:query number | pageSize in:query number | status in:query string enum:['draft', 'open', 'closed', 'archived'] | sessionId in:query string | projectId in:query string
Responses: 200: no-content

## POST /api/v1/evaluation-cycles
operationId: EvaluationCyclesController_create_v1  |  summary: Create a draft cycle; seeds the documented evaluation-v1 template (35/30/20/15) by default — criteria editable only while draft
Body (application/json): CreateEvaluationCycleDto = {code*:string, name*:string, sessionId:object, projectId:object, type*:string enum:['sprint', 'midterm', 'final'], startDate*:string, endDate*:string, dueDate:object, useDefaultTemplate:boolean}
Responses: 201: no-content

## GET /api/v1/evaluation-cycles/{id}
operationId: EvaluationCyclesController_getOne_v1  |  summary: One evaluation cycle (evaluations.view)
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/evaluation-cycles/{id}
operationId: EvaluationCyclesController_update_v1  |  summary: Update a DRAFT cycle (name/dates) — open/closed/archived cycles are immutable
Params: id in:path required string
Body (application/json): UpdateEvaluationCycleDto = {name:string, startDate:string, endDate:string, dueDate:object}
Responses: 200: no-content

## GET /api/v1/evaluation-cycles/{id}/criteria
operationId: EvaluationCyclesController_criteria_v1  |  summary: Cycle criteria with weights (evaluations.view)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/evaluation-cycles/{id}/criteria
operationId: EvaluationCyclesController_addCriterion_v1  |  summary: Add a criterion (draft cycles only; weight 0<w<=100)
Params: id in:path required string
Body (application/json): CreateEvaluationCriterionDto = {code*:string, name*:string, description:object, weight*:number, maxScore:number, sortOrder:number, isRequired:boolean}
Responses: 201: no-content

## DELETE /api/v1/evaluation-cycles/{id}/criteria/{criterionId}
operationId: EvaluationCyclesController_deleteCriterion_v1  |  summary: Delete a criterion (draft cycles only)
Params: id in:path required string | criterionId in:path required string
Responses: 200: no-content

## PATCH /api/v1/evaluation-cycles/{id}/criteria/{criterionId}
operationId: EvaluationCyclesController_updateCriterion_v1  |  summary: Update a criterion (draft cycles only)
Params: id in:path required string | criterionId in:path required string
Body (application/json): UpdateEvaluationCriterionDto = {code:string, name:string, description:object, weight:number, maxScore:number, sortOrder:number, isRequired:boolean}
Responses: 200: no-content

## POST /api/v1/evaluation-cycles/{id}/status
operationId: EvaluationCyclesController_changeStatus_v1  |  summary: Explicit cycle state transition (draft→open|archived, open→closed, closed→archived); opening requires active criteria weights to total exactly 100%
Params: id in:path required string
Body (application/json): ChangeEvaluationCycleStatusDto = {status*:string enum:['draft', 'open', 'closed', 'archived']}
Responses: 201: no-content
