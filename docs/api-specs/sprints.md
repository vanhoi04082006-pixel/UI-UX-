# API GROUP: sprints (7 ops)

## GET /api/v1/sprints
operationId: SprintsController_list_v1  |  summary: Paginated sprints (sprints.view; filters: projectId, sessionId, status; managed scope only)
Params: page in:query number | pageSize in:query number | projectId in:query string | sessionId in:query string | status in:query string enum:['planned', 'active', 'completed', 'cancelled']
Responses: 200: no-content

## POST /api/v1/sprints
operationId: SprintsController_create_v1  |  summary: Create sprint (sprints.manage; planned status; ONE tx with audit; 409 PROJECT_NOT_ASSIGNABLE / SPRINT_CODE_TAKEN / 404 PROJECT_NOT_FOUND / SESSION_NOT_FOUND)
Body (application/json): CreateSprintDto = {code*:string, name*:string, description:string, projectId*:string, sessionId:string, goal:string, startDate*:string, endDate*:string}
Responses: 201: no-content

## GET /api/v1/sprints/{id}
operationId: SprintsController_getOne_v1  |  summary: Sprint detail (sprints.view; includes project/session summaries; managed scope only)
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/sprints/{id}
operationId: SprintsController_update_v1  |  summary: Update sprint metadata (sprints.manage; name/description/goal/dates; terminal sprints frozen → 409 INVALID_SPRINT_TRANSITION; 400 INVALID_SPRINT_DATES)
Params: id in:path required string
Body (application/json): UpdateSprintDto = {name:string, description:string, goal:string, startDate:string, endDate:string}
Responses: 200: no-content

## GET /api/v1/sprints/{id}/board
operationId: SprintsController_board_v1  |  summary: Sprint board — REAL grouping by actual task status (sprints.view; columns carry true counts, never hardcoded; ordered priority→dueDate→createdAt)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/sprints/{id}/completion
operationId: SprintsController_completion_v1  |  summary: Sprint completion summary (sprints.view; total/done/open tasks + committed/completed story points aggregated from the DB; NULL when no task declares points)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/sprints/{id}/status
operationId: SprintsController_transition_v1  |  summary: Sprint status transition (sprints.manage; legal: planned→active|cancelled, active→completed|cancelled; 409 INVALID_SPRINT_TRANSITION / SPRINT_ACTIVE_EXISTS / SPRINT_HAS_OPEN_TASKS unless allowOpenTasks=true; activation notifies project interns)
Params: id in:path required string
Body (application/json): TransitionSprintDto = {status*:string enum:['planned', 'active', 'completed', 'cancelled'], allowOpenTasks:boolean}
Responses: 201: no-content
