# API GROUP: imported-reviews (2 ops)

## GET /api/v1/imported-reviews
operationId: ImportedReviewsController_list_v1  |  summary: -
Responses: 200: no-content

## PATCH /api/v1/imported-reviews/{id}
operationId: ImportedReviewsController_update_v1  |  summary: -
Params: id in:path required string
Body (application/json): UpdateImportedReviewDto = {}
Responses: 200: no-content
