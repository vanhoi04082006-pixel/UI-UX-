# API GROUP: projects (10 ops)

## GET /api/v1/projects
operationId: ProjectsController_list_v1  |  summary: Paginated projects (projects.view; filters: q, status, difficulty; sort whitelist: createdAt|code|name; scoped to managed + unclaimed library projects)
Params: page in:query number | pageSize in:query number | domainCategory in:query string | technology in:query string | q in:query string | status in:query string enum:['draft', 'active', 'completed', 'archived'] | difficulty in:query string enum:['beginner', 'intermediate', 'advanced'] | sort in:query string enum:['createdAt', 'code', 'name'] | order in:query string enum:['ASC', 'DESC']
Responses: 200: no-content

## POST /api/v1/projects
operationId: ProjectsController_create_v1  |  summary: Create project (projects.manage; audited; technologies relational)
Body (application/json): CreateProjectDto = {code*:string, name*:string, description*:string, domainCategory:string, difficulty:string enum:['beginner', 'intermediate', 'advanced'], status:string enum:['draft', 'active', 'completed', 'archived'], mentorId:string, capacity:number, startDate:string, endDate:string, technologies:array<string>}
Responses: 201: no-content

## GET /api/v1/projects/filter-options
operationId: ProjectsController_filterOptions_v1  |  summary: -
Responses: 200: no-content

## GET /api/v1/projects/{id}
operationId: ProjectsController_getOne_v1  |  summary: Project detail incl. technologies (projects.view; managed + unclaimed library scope)
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/projects/{id}
operationId: ProjectsController_update_v1  |  summary: Update project (projects.manage; archived is terminal → 409 PROJECT_ARCHIVED; technologies REPLACE strategy)
Params: id in:path required string
Body (application/json): UpdateProjectDto = {name:string, description:string, domainCategory:string, difficulty:string enum:['beginner', 'intermediate', 'advanced'], status:string enum:['draft', 'active', 'completed', 'archived'], mentorId:string, capacity:number, startDate:string, endDate:string, technologies:array<string>}
Responses: 200: no-content

## POST /api/v1/projects/{id}/claim
operationId: ProjectsController_claim_v1  |  summary: Claim an unmentored library project (projects.manage; 409 when already claimed)
Params: id in:path required string
Responses: 201: no-content

## GET /api/v1/projects/{id}/members
operationId: ProjectsController_members_v1  |  summary: Project members (projects.view; membership is assignment-driven; managed scope)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/projects/{id}/sessions
operationId: ProjectsController_sessions_v1  |  summary: Sessions running on this project, scoped to managed ones (project history across cohorts)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/projects/{id}/slots
operationId: ProjectsController_slots_v1  |  summary: Role slots with live filled counts (projects.view; managed scope)
Params: id in:path required string
Responses: 200: no-content

## PUT /api/v1/projects/{id}/slots
operationId: ProjectsController_setSlots_v1  |  summary: Replace role slots (projects.manage; managing mentor only; audited)
Params: id in:path required string
Body (application/json): SetProjectSlotsDto = {slots*:array<ProjectRoleSlotDto>}
Responses: 200: no-content
