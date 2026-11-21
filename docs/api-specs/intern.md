# API GROUP: intern (15 ops)

## GET /api/v1/intern/me/certificates
operationId: CertificateInternController_myCertificates_v1  |  summary: My certificates (identity = principal)
Responses: 200: no-content

## GET /api/v1/intern/me/certificates/{id}
operationId: CertificateInternController_myCertificate_v1  |  summary: One of my certificates (404-safe for foreign rows)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/intern/me/certificates/{id}/pdf
operationId: CertificateInternController_myCertificatePdf_v1  |  summary: Download MY certificate PDF (issued only; revoked → 409)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/intern/me/evaluations
operationId: EvaluationInternController_myEvaluations_v1  |  summary: My FINALIZED evaluations with scores (identity = principal; drafts/submitted are internal)
Responses: 200: no-content

## GET /api/v1/intern/me/evaluations/{id}
operationId: EvaluationInternController_myEvaluation_v1  |  summary: One of my finalized evaluations (404-safe for foreign/unfinished rows)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/intern/me/kpi
operationId: KpiInternController_myResults_v1  |  summary: My KPI results with their periods (identity = principal)
Responses: 200: no-content

## GET /api/v1/intern/me/kpi/{id}
operationId: KpiInternController_myResult_v1  |  summary: One of my KPI results incl. provenance (404-safe for foreign results)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/intern/me/performance
operationId: PerformanceInternController_me_v1  |  summary: My deterministic performance metrics (identity = principal): real derived values only — never fake charts; null = not measured (not 0)
Responses: 200: no-content

## GET /api/v1/intern/me/project
operationId: InternController_project_v1  |  summary: My active assignment project details and technologies; principal identity only; recruitment gate; 404 when unassigned. No broad projects.view permission required.
Responses: 200: no-content

## GET /api/v1/intern/me/sprint/board
operationId: InternController_sprintBoard_v1  |  summary: My current sprint board with ONLY my tasks and true per-column counts; principal/assignment scoped, paginated per column; 404 when no active assignment/sprint.
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/intern/me/sprints
operationId: InternController_sprints_v1  |  summary: Planned, active and historical sprints in my active assignment; authenticated principal only.
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/intern/me/sprints/{id}/board
operationId: InternController_selectedSprintBoard_v1  |  summary: Selected assignment sprint board with only my tasks, including planned sprints; never activates a sprint.
Params: id in:path required string | page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/intern/me/virtual-salary
operationId: VirtualSalaryInternController_myBalance_v1  |  summary: My global VIRTUAL ledger balance (identity = principal); optional kpiPeriodId scopes earnedThisPeriod only; this is a virtual unit and NEVER real payroll (spec 33)
Params: kpiPeriodId in:query required string
Responses: 200: no-content

## GET /api/v1/intern/me/virtual-salary/ledger
operationId: VirtualSalaryInternController_myLedger_v1  |  summary: My ledger entries (identity = principal; optional kpiPeriodId filter + pagination)
Params: page in:query number | pageSize in:query number | kpiPeriodId in:query string
Responses: 200: no-content

## GET /api/v1/intern/me/workspace
operationId: InternController_workspace_v1  |  summary: Current-intern workspace — identity = authenticated principal (never a FE-supplied userId); status driven by DB assignment state; Phase 3 adds REAL sprint/task data: currentSprint, taskSummary, focusedTask (null/zero when unassigned)
Responses: 200: no-content
