# API GROUP: sessions (19 ops)

## GET /api/v1/sessions
operationId: SessionsController_list_v1  |  summary: Paginated sessions (sessions.view; filters: q, status; scoped to managed sessions)
Params: page in:query number | pageSize in:query number | projectId in:query string | leadInstructorId in:query string | q in:query string | status in:query string enum:['upcoming', 'active', 'ending', 'completed', 'cancelled']
Responses: 200: no-content

## POST /api/v1/sessions
operationId: SessionsController_create_v1  |  summary: Create session (sessions.manage; audited)
Body (application/json): CreateSessionDto = {code*:string, name*:string, description:string, status:string enum:['upcoming', 'active', 'ending', 'completed', 'cancelled'], leadInstructorId:string, startDate*:string, endDate*:string}
Responses: 201: no-content

## GET /api/v1/sessions/instructor-options
operationId: SessionsController_instructorOptions_v1  |  summary: Search/paginate qualified active instructors; public identity fields only, effective sessions.manage grants including groups
Params: page in:query number | pageSize in:query number | q in:query string
Responses: 200: no-content

## GET /api/v1/sessions/member-options
operationId: SessionsController_memberOptions_v1  |  summary: -
Params: page in:query number | pageSize in:query number | q in:query string
Responses: 200: no-content

## GET /api/v1/sessions/overview
operationId: SessionsController_overview_v1  |  summary: Session management overview (sessions.view; bounded aggregate queries; scoped; no N+1)
Params: page in:query number | pageSize in:query number | projectId in:query string | leadInstructorId in:query string | q in:query string | status in:query string enum:['upcoming', 'active', 'ending', 'completed', 'cancelled'] | sortBy in:query string enum:['startDate', 'endDate', 'name', 'progress'] | sortDirection in:query string enum:['asc', 'desc']
Responses: 200: no-content

## GET /api/v1/sessions/{id}
operationId: SessionsController_getOne_v1  |  summary: Session detail (sessions.view; managed scope only)
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/sessions/{id}
operationId: SessionsController_update_v1  |  summary: Update session (sessions.manage; status transitions enforced by the backend state machine — 409 INVALID_SESSION_TRANSITION)
Params: id in:path required string
Body (application/json): UpdateSessionDto = {name:string, description:string, status:string enum:['upcoming', 'active', 'ending', 'completed', 'cancelled'], leadInstructorId:string, startDate:string, endDate:string}
Responses: 200: no-content

## GET /api/v1/sessions/{id}/instructors
operationId: SessionsController_instructors_v1  |  summary: Session instructors (sessions.view; managed scope only)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/sessions/{id}/instructors
operationId: SessionsController_addInstructors_v1  |  summary: Add instructors (sessions.manage; DB-resolved permission check on each target — 403 INSTRUCTOR_PERMISSION_MISSING)
Params: id in:path required string
Body (application/json): AddSessionInstructorsDto = {instructorIds*:array<string>}
Responses: 201: no-content

## DELETE /api/v1/sessions/{id}/instructors/{userId}
operationId: SessionsController_removeInstructor_v1  |  summary: Remove instructor (audited)
Params: id in:path required string | userId in:path required string
Responses: 200: no-content

## GET /api/v1/sessions/{id}/members
operationId: SessionsController_members_v1  |  summary: Session members (sessions.view; managed scope only)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/sessions/{id}/members
operationId: SessionsController_addMembers_v1  |  summary: Add members (idempotent; audited)
Params: id in:path required string
Body (application/json): AddSessionMembersDto = {userIds*:array<string>}
Responses: 201: no-content

## DELETE /api/v1/sessions/{id}/members/{userId}
operationId: SessionsController_removeMember_v1  |  summary: Remove member (audited)
Params: id in:path required string | userId in:path required string
Responses: 200: no-content

## GET /api/v1/sessions/{id}/milestones
operationId: SessionsController_milestones_v1  |  summary: Session milestones (sessions.view; ordered by sortOrder; managed scope only)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/sessions/{id}/milestones
operationId: SessionsController_createMilestone_v1  |  summary: Create milestone (sessions.manage; audited)
Params: id in:path required string
Body (application/json): CreateMilestoneDto = {title*:string, description:string, dueDate:string, status:string enum:['pending', 'in_progress', 'completed'], sortOrder:number}
Responses: 201: no-content

## DELETE /api/v1/sessions/{id}/milestones/{milestoneId}
operationId: SessionsController_deleteMilestone_v1  |  summary: Delete milestone (sessions.manage; audited)
Params: id in:path required string | milestoneId in:path required string
Responses: 200: no-content

## PATCH /api/v1/sessions/{id}/milestones/{milestoneId}
operationId: SessionsController_updateMilestone_v1  |  summary: Update milestone (sessions.manage; audited)
Params: id in:path required string | milestoneId in:path required string
Body (application/json): UpdateMilestoneDto = {title:string, description:string, dueDate:string, status:string enum:['pending', 'in_progress', 'completed'], sortOrder:number}
Responses: 200: no-content

## GET /api/v1/sessions/{id}/timeline
operationId: SessionsController_timeline_v1  |  summary: -
Params: id in:path required string | page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/sessions/{id}/work
operationId: SessionsController_delivery_v1  |  summary: Session work page with dependency, latest submission and AI/human review facts; managed task scope
Params: id in:path required string | page in:query number | pageSize in:query number | search in:query string | projectId in:query string | sprintId in:query string | sessionId in:query string | assigneeId in:query string | status in:query string enum:['todo', 'doing', 'review', 'done'] | priority in:query string enum:['low', 'medium', 'high', 'critical'] | dueFrom in:query string | dueTo in:query string | mine in:query boolean | sortBy in:query string enum:['createdAt', 'dueDate', 'priority'] | sortOrder in:query string enum:['ASC', 'DESC']
Responses: 200: no-content
