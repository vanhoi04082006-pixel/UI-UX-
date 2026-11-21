# API GROUP: ai-generations (5 ops)

## GET /api/v1/ai-generations/plans
operationId: AiGenerationController_plans_v1  |  summary: AI plan history of one session (owned scope)
Params: sessionId in:query required string
Responses: 200: no-content

## POST /api/v1/ai-generations/plans/generate
operationId: AiGenerationController_generate_v1  |  summary: Generate and persist an AI plan draft (sprints.manage; idempotent per session+version; review before confirm)
Body (application/json): GeneratePlanDto = {regenerate:boolean, projectId*:string, sessionId*:string, sprintCount:number, startDate:string, requestId:string}
Responses: 201: no-content

## GET /api/v1/ai-generations/plans/{id}
operationId: AiGenerationController_plan_v1  |  summary: One AI plan with fresh warnings (owned scope)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/ai-generations/sprint-plan/confirm
operationId: AiGenerationController_confirm_v1  |  summary: Confirm an instructor-reviewed draft (sprints.manage; re-validated server-side; idempotent per requestId)
Body (application/json): ConfirmSprintPlanDto = {projectId*:string, sessionId*:string, draft*:object, requestId*:string, planId:string}
Responses: 201: no-content

## POST /api/v1/ai-generations/sprint-plan/draft
operationId: AiGenerationController_draft_v1  |  summary: Generate a sprint/task draft with AI (sprints.manage; managed project+session only; persists nothing)
Body (application/json): DraftSprintPlanDto = {projectId*:string, sessionId*:string, sprintCount:number, startDate:string}
Responses: 201: no-content
