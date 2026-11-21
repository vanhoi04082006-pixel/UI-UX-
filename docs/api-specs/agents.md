# API GROUP: agents (5 ops)

## GET /api/v1/admin/agents/business-runs
operationId: BusinessAgentMonitorController_list_v1  |  summary: -
Params: page in:query number | pageSize in:query number | agentId in:query string enum:['cv-analyst', 'role-matcher', 'interview-coordinator', 'interview-conversation', 'interview-evaluator', 'project-planner', 'code-reviewer', 'learning-mentor', 'performance-advisor', 'replacement-advisor', 'instructor-assistant'] | status in:query string enum:['queued', 'running', 'paused', 'succeeded', 'failed', 'cancelled']
Responses: 200: no-content

## POST /api/v1/admin/agents/knowledge-runs
operationId: AgentsController_create_v1  |  summary: -
Body (application/json): CreateKnowledgeAgentDto = {requestId*:string, question*:string, roleCode:string}
Responses: 202: no-content

## GET /api/v1/admin/agents/knowledge-runs/{id}
operationId: AgentsController_get_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/admin/agents/knowledge-runs/{id}/cancel
operationId: AgentsController_cancel_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/admin/agents/knowledge-runs/{id}/resume
operationId: AgentsController_resume_v1  |  summary: -
Params: id in:path required string
Responses: 202: no-content
