# API GROUP: assignments (5 ops)

## GET /api/v1/assignments
operationId: AssignmentsController_list_v1  |  summary: Paginated assignments (assignments.view; filters: internId, sessionId, projectId, status; own or managed-session scope)
Params: page in:query number | pageSize in:query number | internId in:query string | sessionId in:query string | projectId in:query string | status in:query string enum:['active', 'completed', 'cancelled']
Responses: 200: no-content

## POST /api/v1/assignments
operationId: AssignmentsController_create_v1  |  summary: Create assignment — ONE transaction: intern lock, session/project validation, capacity, conflict check, membership ensure, notification+audit+activity (409 ASSIGNMENT_CONFLICT / PROJECT_CAPACITY_FULL / SESSION_NOT_ASSIGNABLE / PROJECT_NOT_ASSIGNABLE)
Body (application/json): CreateAssignmentDto = {internId*:string, projectId*:string, sessionId*:string, role:string}
Responses: 201: no-content

## GET /api/v1/assignments/{id}
operationId: AssignmentsController_getOne_v1  |  summary: Assignment detail (assignments.view; includes project/session/intern summaries; own or managed-session scope)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/assignments/{id}/cancel
operationId: AssignmentsController_cancel_v1  |  summary: Cancel an active assignment (assignments.manage; session roster row removed; audited; intern notified)
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/assignments/{id}/complete
operationId: AssignmentsController_complete_v1  |  summary: Complete an active assignment (assignments.manage; audited; intern notified; history preserved)
Params: id in:path required string
Responses: 201: no-content
