# API GROUP: tasks (9 ops)

## GET /api/v1/tasks
operationId: TasksController_list_v1  |  summary: Paginated tasks (broad callers: filters search/projectId/sprintId/assigneeId/status/priority/due range + sort whitelist; everyone else is ALWAYS scoped to own tasks; mine=true → self)
Params: page in:query number | pageSize in:query number | search in:query string | projectId in:query string | sprintId in:query string | sessionId in:query string | assigneeId in:query string | status in:query string enum:['todo', 'doing', 'review', 'done'] | priority in:query string enum:['low', 'medium', 'high', 'critical'] | dueFrom in:query string | dueTo in:query string | mine in:query boolean | sortBy in:query string enum:['createdAt', 'dueDate', 'priority'] | sortOrder in:query string enum:['ASC', 'DESC']
Responses: 200: no-content

## POST /api/v1/tasks
operationId: TasksController_create_v1  |  summary: Create task (tasks.manage; ONE tx: project lock+active check, sprint/project match, assignee active-assignment check, SEQUENCE code, history seed, notification+activity+audit; 409 PROJECT_NOT_ASSIGNABLE / SPRINT_PROJECT_MISMATCH / INVALID_ASSIGNEE / TASK_CODE_CONFLICT)
Body (application/json): CreateTaskDto = {title*:string, description:string, projectId*:string, sprintId:string, assigneeId:string, priority:string enum:['low', 'medium', 'high', 'critical'], storyPoints:number, dueDate:string}
Responses: 201: no-content

## DELETE /api/v1/tasks/{id}
operationId: TasksController_remove_v1  |  summary: Soft-delete task (tasks.manage; deletedAt set, history preserved, audited)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/tasks/{id}
operationId: TasksController_getOne_v1  |  summary: Task detail (assignee OR tasks.view/tasks.manage; 403 TASK_ACCESS_DENIED otherwise)
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/tasks/{id}
operationId: TasksController_update_v1  |  summary: Update task (tasks.manage; metadata + sprint move + assignee change + optional status transition incl. rework review→doing; history + notifications + audit in ONE tx; 409 SPRINT_PROJECT_MISMATCH / INVALID_ASSIGNEE / INVALID_TASK_TRANSITION / TASK_VERSION_CONFLICT)
Params: id in:path required string
Body (application/json): UpdateTaskDto = {expectedVersion:number, title:string, description:string, sprintId:string, assigneeId:object, priority:string enum:['low', 'medium', 'high', 'critical'], storyPoints:number, dueDate:string, status:string enum:['todo', 'doing', 'review', 'done'], reason:string}
Responses: 200: no-content

## GET /api/v1/tasks/{id}/comments
operationId: TasksController_listComments_v1  |  summary: Task comments (paginated, oldest first; assignee OR tasks.view/tasks.manage)
Params: id in:path required string | page in:query number | pageSize in:query number | search in:query string | projectId in:query string | sprintId in:query string | sessionId in:query string | assigneeId in:query string | status in:query string enum:['todo', 'doing', 'review', 'done'] | priority in:query string enum:['low', 'medium', 'high', 'critical'] | dueFrom in:query string | dueTo in:query string | mine in:query boolean | sortBy in:query string enum:['createdAt', 'dueDate', 'priority'] | sortOrder in:query string enum:['ASC', 'DESC']
Responses: 200: no-content

## POST /api/v1/tasks/{id}/comments
operationId: TasksController_addComment_v1  |  summary: Add task comment (assignee OR tasks.manage holders; content 1..2000; comments on inaccessible tasks rejected 403 TASK_ACCESS_DENIED)
Params: id in:path required string
Body (application/json): CreateTaskCommentDto = {content*:string}
Responses: 201: no-content

## GET /api/v1/tasks/{id}/history
operationId: TasksController_listHistory_v1  |  summary: Task status history (append-only, oldest first; assignee OR tasks.view/tasks.manage)
Params: id in:path required string | page in:query number | pageSize in:query number | search in:query string | projectId in:query string | sprintId in:query string | sessionId in:query string | assigneeId in:query string | status in:query string enum:['todo', 'doing', 'review', 'done'] | priority in:query string enum:['low', 'medium', 'high', 'critical'] | dueFrom in:query string | dueTo in:query string | mine in:query boolean | sortBy in:query string enum:['createdAt', 'dueDate', 'priority'] | sortOrder in:query string enum:['ASC', 'DESC']
Responses: 200: no-content

## PATCH /api/v1/tasks/{id}/my
operationId: TasksController_updateOwn_v1  |  summary: Intern updates OWN task (tasks.update.own; identity = authenticated principal; ONLY status todo→doing / doing→review + progress; 403 TASK_NOT_OWNED / ASSIGNMENT_NOT_ACTIVE; 409 INVALID_TASK_TRANSITION)
Params: id in:path required string
Body (application/json): UpdateMyTaskDto = {expectedVersion:number, status:string enum:['todo', 'doing', 'review', 'done'], progress:number, reason:string}
Responses: 200: no-content
