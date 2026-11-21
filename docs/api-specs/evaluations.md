# API GROUP: evaluations (7 ops)

## GET /api/v1/evaluations
operationId: EvaluationsController_list_v1  |  summary: List evaluations (evaluations.view; filters cycleId/internId/evaluatorId/status)
Params: page in:query number | pageSize in:query number | status in:query string enum:['draft', 'submitted', 'finalized'] | cycleId in:query string | internId in:query string | evaluatorId in:query string
Responses: 200: no-content

## POST /api/v1/evaluations
operationId: EvaluationsController_create_v1  |  summary: Create a draft evaluation in an OPEN cycle; evaluator defaults to principal; intern must belong to the cycle scope; ownership enforced (spec 61)
Body (application/json): CreateEvaluationDto = {cycleId*:string, internId*:string, evaluatorId:string}
Responses: 201: no-content

## GET /api/v1/evaluations/{id}
operationId: EvaluationsController_getOne_v1  |  summary: One evaluation with criterion scores (evaluations.view)
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/evaluations/{id}
operationId: EvaluationsController_update_v1  |  summary: Upsert criterion scores (0..criterion.maxScore) + summary on a draft/submitted evaluation; overallScore is ALWAYS recomputed server-side (spec 12)
Params: id in:path required string
Body (application/json): UpdateEvaluationDto = {scores*:array<EvaluationScoreInputDto>, summary:object}
Responses: 200: no-content

## POST /api/v1/evaluations/{id}/finalize
operationId: EvaluationsController_finalize_v1  |  summary: submitted → finalized: backend recomputes the weighted overall, locks the evaluation, writes audit + activity and notifies the intern (one transaction)
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/evaluations/{id}/revisions
operationId: EvaluationsController_revise_v1  |  summary: PRIVILEGED correction of a finalized evaluation (admin policy): stays finalized, revisionNumber++, immutable revision row with previous/new overall + reason (spec 14)
Params: id in:path required string
Body (application/json): ReviseEvaluationDto = {scores:array<EvaluationScoreInputDto>, summary:string, reason*:string}
Responses: 201: no-content

## POST /api/v1/evaluations/{id}/submit
operationId: EvaluationsController_submit_v1  |  summary: draft → submitted: validates required criteria + weights == 100 (evaluator-owned)
Params: id in:path required string
Responses: 201: no-content
