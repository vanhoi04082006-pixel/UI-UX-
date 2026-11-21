# API GROUP: groups (8 ops)

## GET /api/v1/groups
operationId: GroupsController_list_v1  |  summary: Paginated groups (groups.read)
Params: page in:query number | pageSize in:query number | q in:query string
Responses: 200: no-content

## POST /api/v1/groups
operationId: GroupsController_create_v1  |  summary: Create group (groups.manage; audited)
Body (application/json): CreateGroupDto = {code*:string, name*:string, description:string}
Responses: 201: no-content

## PATCH /api/v1/groups/{id}
operationId: GroupsController_update_v1  |  summary: Update group (groups.manage; audited)
Params: id in:path required string
Body (application/json): UpdateGroupDto = {name:string, description:string}
Responses: 200: no-content

## GET /api/v1/groups/{id}/members
operationId: GroupsController_members_v1  |  summary: List group members (groups.read)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/groups/{id}/members
operationId: GroupsController_addMembers_v1  |  summary: Add members (idempotent; audited)
Params: id in:path required string
Body (application/json): AddGroupMembersDto = {userIds*:array<string>}
Responses: 201: no-content

## DELETE /api/v1/groups/{id}/members/{userId}
operationId: GroupsController_removeMember_v1  |  summary: Remove member (audited)
Params: id in:path required string | userId in:path required string
Responses: 200: no-content

## GET /api/v1/groups/{id}/roles
operationId: GroupsController_roles_v1  |  summary: Actual role codes granted to a group (groups.read)
Params: id in:path required string
Responses: 200: no-content

## PUT /api/v1/groups/{id}/roles
operationId: GroupsController_setRoles_v1  |  summary: Replace group role set (groups.manage; audited)
Params: id in:path required string
Body (application/json): SetGroupRolesDto = {roleCodes*:array<string>}
Responses: 200: no-content
