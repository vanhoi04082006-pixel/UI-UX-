# API GROUP: career-roles (8 ops)

## GET /api/v1/admin/career-roles
operationId: CareerRolesAdminController_list_v1  |  summary: -
Responses: 200: no-content

## POST /api/v1/admin/career-roles
operationId: CareerRolesAdminController_create_v1  |  summary: -
Body (application/json): CreateCareerRoleDto = {}
Responses: 201: no-content

## GET /api/v1/admin/career-roles/{code}
operationId: CareerRolesAdminController_get_v1  |  summary: -
Params: code in:path required string
Responses: 200: no-content

## PUT /api/v1/admin/career-roles/{code}
operationId: CareerRolesAdminController_update_v1  |  summary: -
Params: code in:path required string
Body (application/json): UpdateCareerRoleDto = {}
Responses: 200: no-content

## POST /api/v1/admin/career-roles/{code}/archive
operationId: CareerRolesAdminController_archive_v1  |  summary: -
Params: code in:path required string
Body (application/json): CareerRoleVersionDto = {}
Responses: 201: no-content

## GET /api/v1/admin/career-roles/{code}/revisions
operationId: CareerRolesAdminController_revisions_v1  |  summary: -
Params: code in:path required string
Responses: 200: no-content

## GET /api/v1/career-roles
operationId: CareerRolesCatalogController_list_v1  |  summary: -
Responses: 200: no-content

## GET /api/v1/career-roles/reference
operationId: CareerRolesCatalogController_references_v1  |  summary: -
Responses: 200: no-content
