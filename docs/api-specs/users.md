# API GROUP: users (5 ops)

## GET /api/v1/users
operationId: UsersController_list_v1  |  summary: Paginated user list (users.read)
Params: page in:query number | pageSize in:query number | roleCode in:query string | q in:query string | status in:query string enum:['active', 'pending', 'locked', 'deleted']
Responses: 200: no-content

## POST /api/v1/users
operationId: UsersController_create_v1  |  summary: Create user (users.create; audited)
Body (application/json): CreateUserDto = {email*:string, username*:string, displayName*:string, password*:string, roleCodes:array<string>}
Responses: 201: no-content

## GET /api/v1/users/{id}
operationId: UsersController_getOne_v1  |  summary: Get one user (users.read)
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/users/{id}
operationId: UsersController_update_v1  |  summary: Update profile fields (users.update; audited)
Params: id in:path required string
Body (application/json): UpdateUserDto = {displayName:string, username:string}
Responses: 200: no-content

## PATCH /api/v1/users/{id}/status
operationId: UsersController_setStatus_v1  |  summary: Set account status (users.status; audited)
Params: id in:path required string
Body (application/json): SetUserStatusDto = {status*:string enum:['active', 'pending', 'locked', 'deleted']}
Responses: 200: no-content
