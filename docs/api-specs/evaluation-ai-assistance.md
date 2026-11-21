# API GROUP: evaluation-ai-assistance (3 ops)

## GET /api/v1/evaluations/{id}/ai-suggestions
operationId: EvaluationAssistanceController_list_v1  |  summary: List AI suggestion history for an evaluation (ai.evaluation.assist; ownership enforced)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/evaluations/{id}/ai-suggestions
operationId: EvaluationAssistanceController_generate_v1  |  summary: Generate an AI draft suggestion for an evaluation (ai.evaluation.assist; evaluator-of-record or admin; DRAFT ONLY — advisory, non-authoritative, never applied automatically; regenerations append history)
Params: id in:path required string
Responses: 201: no-content

## GET /api/v1/evaluations/{id}/ai-suggestions/{suggestionId}
operationId: EvaluationAssistanceController_getOne_v1  |  summary: One AI suggestion (ai.evaluation.assist; ownership enforced; 404-safe for foreign rows)
Params: id in:path required string | suggestionId in:path required string
Responses: 200: no-content
