# API GROUP: performance (3 ops)

## GET /api/v1/performance/interns
operationId: PerformanceController_list_v1  |  summary: Deterministic intern performance list (performance.view): real task/story-point/evaluation metrics; instructors see only interns they own (session instructor / project mentor) — spec 61
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/performance/interns/{userId}
operationId: PerformanceController_getOne_v1  |  summary: Full deterministic metrics for ONE intern (performance.view): taskCompletionRate, storyPointCompletionRate, onTimeCompletionRate (null when no due-dated completions), overdueOpenTaskCount, averageEvaluationScore (null when none) — 403 for interns you do not own
Params: userId in:path required string
Responses: 200: no-content

## GET /api/v1/performance/interns/{userId}/detail
operationId: PerformanceController_studentDetail_v1  |  summary: -
Params: userId in:path required string | page in:query number | pageSize in:query number
Responses: 200: no-content
