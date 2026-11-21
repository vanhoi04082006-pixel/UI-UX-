# API GROUP: virtual-salary (4 ops)

## GET /api/v1/virtual-salary
operationId: VirtualSalaryController_list_v1  |  summary: Ledger list (admin; filters userId/type/kpiPeriodId + pagination)
Params: page in:query number | pageSize in:query number | userId in:query string | type in:query string enum:['kpi_earning', 'bonus', 'penalty', 'adjustment', 'reversal'] | kpiPeriodId in:query string
Responses: 200: no-content

## POST /api/v1/virtual-salary/adjustments
operationId: VirtualSalaryController_adjust_v1  |  summary: Ledger adjustment (admin): bonus (+), penalty (−), signed adjustment, or reversal of an existing row — always reason + audit + notification; no hidden balance edits exist anywhere (spec 37/38)
Body (application/json): CreateSalaryAdjustmentDto = {userId*:string, type*:string enum:['bonus', 'penalty', 'adjustment', 'reversal'], amount:number, sourceId:string, reason*:string, requestId:string}
Responses: 201: no-content

## POST /api/v1/virtual-salary/generate/{kpiPeriodId}
operationId: VirtualSalaryController_generate_v1  |  summary: Generate virtual salary from a FINALIZED KPI period (admin): base from the virtual_salary.base_amount setting (missing → 409 VIRTUAL_SALARY_CONFIG_MISSING); UNIQUE idempotencyKey — regenerating never duplicates rows (spec 34/36)
Params: kpiPeriodId in:path required string
Responses: 201: no-content

## GET /api/v1/virtual-salary/users/{userId}/balance
operationId: VirtualSalaryController_balance_v1  |  summary: Global ledger-derived balance for one user (admin); optional kpiPeriodId scopes earnedThisPeriod only, while balance and latestEntries remain global (spec 40)
Params: userId in:path required string | kpiPeriodId in:query required string
Responses: 200: no-content
