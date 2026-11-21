# API GROUP: rbac (3 ops)

## GET /api/v1/permissions
operationId: RbacController_permissions_v1  |  summary: Paginated permissions (permissions.read)
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/roles
operationId: RbacController_roles_v1  |  summary: Paginated roles (roles.read)
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/roles/{id}/permissions
operationId: RbacController_rolePermissions_v1  |  summary: Paginated actual permission grants for one role; read-only policy matrix
Params: id in:path required string | page in:query number | pageSize in:query number
Responses: 200: no-content
