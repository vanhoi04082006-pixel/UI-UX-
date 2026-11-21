# API GROUP: audit (2 ops)

## GET /api/v1/activity-events
operationId: AuditController_activityEvents_v1  |  summary: Paginated recent activity (activity.read)
Params: page in:query number | pageSize in:query number | actorId in:query string | module in:query string
Responses: 200: no-content

## GET /api/v1/audit-logs
operationId: AuditController_auditLogs_v1  |  summary: Paginated audit trail (audit.read)
Params: page in:query number | pageSize in:query number | actorId in:query string | action in:query string | from in:query string | to in:query string
Responses: 200: no-content
