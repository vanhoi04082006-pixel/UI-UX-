# API GROUP: reports (5 ops)

## GET /api/v1/reports
operationId: ReportsController_list_v1  |  summary: -
Responses: 200: no-content

## POST /api/v1/reports
operationId: ReportsController_create_v1  |  summary: -
Body (application/json): CreateReportDto = {}
Responses: 201: no-content

## GET /api/v1/reports/{id}
operationId: ReportsController_get_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/reports/{id}/pdf
operationId: ReportsController_download_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/reports/{id}/xlsx
operationId: ReportsController_downloadExcel_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content
