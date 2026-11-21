# API GROUP: catalogs (5 ops)

## GET /api/v1/catalogs/items
operationId: CatalogsController_items_v1  |  summary: Paginated items of a type (?typeCode=…)
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## POST /api/v1/catalogs/items
operationId: CatalogsController_createItem_v1  |  summary: Create catalog item (catalogs.manage; audited)
Body (application/json): CreateCatalogItemDto = {}
Responses: 201: no-content

## PATCH /api/v1/catalogs/items/{id}
operationId: CatalogsController_updateItem_v1  |  summary: Update catalog item (catalogs.manage; audited)
Params: id in:path required string
Body (application/json): UpdateCatalogItemDto = {}
Responses: 200: no-content

## GET /api/v1/catalogs/types
operationId: CatalogsController_types_v1  |  summary: Paginated catalog types (catalogs.read)
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## POST /api/v1/catalogs/types
operationId: CatalogsController_createType_v1  |  summary: Create catalog type (catalogs.manage; audited)
Body (application/json): CreateCatalogTypeDto = {}
Responses: 201: no-content
