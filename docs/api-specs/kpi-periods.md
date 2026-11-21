# API GROUP: kpi-periods (8 ops)

## GET /api/v1/kpi-periods
operationId: KpiPeriodsController_list_v1  |  summary: List KPI periods (kpi.view; filter: status)
Responses: 200: no-content

## POST /api/v1/kpi-periods
operationId: KpiPeriodsController_create_v1  |  summary: Create a KPI period (kpi.manage = admin policy): ruleVersion is pinned to kpi-v1
Body (application/json): CreateKpiPeriodDto = {code*:string, name*:string, startDate*:string, endDate*:string}
Responses: 201: no-content

## GET /api/v1/kpi-periods/{id}
operationId: KpiPeriodsController_getOne_v1  |  summary: One KPI period (kpi.view)
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/kpi-periods/{id}
operationId: KpiPeriodsController_update_v1  |  summary: Edit draft/open periods only — code + ruleVersion are immutable (spec 76)
Params: id in:path required string
Body (application/json): UpdateKpiPeriodDto = {code:string, name:string, startDate:string, endDate:string}
Responses: 200: no-content

## POST /api/v1/kpi-periods/{id}/calculate
operationId: KpiPeriodsController_calculate_v1  |  summary: Run the deterministic kpi-v1 batch (open→calculating→open): per-user results + full component provenance; concurrent request → 409 KPI_CALCULATION_IN_PROGRESS; finalized periods never recalculate (spec 27/28)
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/kpi-periods/{id}/finalize
operationId: KpiPeriodsController_finalize_v1  |  summary: open → finalized after a successful current calculation; stale/failed/missing calculation → 409 KPI_CALCULATION_REQUIRED; locks the period and notifies calculated results (spec 28)
Params: id in:path required string
Responses: 201: no-content

## GET /api/v1/kpi-periods/{id}/results
operationId: KpiPeriodsController_results_v1  |  summary: Persisted KPI results of the period, best-first (kpi.view)
Params: id in:path required string | page in:query number | pageSize in:query number
Responses: 200: no-content

## POST /api/v1/kpi-periods/{id}/status
operationId: KpiPeriodsController_changeStatus_v1  |  summary: Explicit KPI period transition; finalized uses canonical readiness/audit/notification checks; calculating is engine-managed (spec 23)
Params: id in:path required string
Body (application/json): TransitionKpiPeriodDto = {status*:string enum:['draft', 'open', 'calculating', 'finalized', 'closed']}
Responses: 201: no-content
