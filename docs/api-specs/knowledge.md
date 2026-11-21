# API GROUP: knowledge (10 ops)

## GET /api/v1/admin/knowledge
operationId: KnowledgeController_list_v1  |  summary: -
Params: page in:query ? | pageSize in:query ? | search in:query string | status in:query string enum:['draft', 'published', 'archived'] | kind in:query string enum:['qa', 'guide', 'exercise', 'solution', 'rubric', 'plan_template', 'communication'] | audience in:query string enum:['student_safe', 'staff_only', 'grading_only'] | purpose in:query string enum:['interview', 'interview_evaluation', 'planning', 'code_review', 'mentoring', 'evaluation_assistance', 'recommendation', 'cv_screening', 'communication'] | roleCode in:query string
Responses: 200: no-content

## POST /api/v1/admin/knowledge
operationId: KnowledgeController_create_v1  |  summary: -
Body (application/json): CreateKnowledgeDto = {code*:string, draft*:KnowledgeDraftDto}
Responses: 201: no-content

## POST /api/v1/admin/knowledge/import/dry-run
operationId: KnowledgeController_dryRun_v1  |  summary: -
Body (application/json): KnowledgeImportDryRunDto = {entries*:array<object>}
Responses: 200: no-content

## GET /api/v1/admin/knowledge/{code}
operationId: KnowledgeController_get_v1  |  summary: -
Params: code in:path required string
Responses: 200: no-content

## PUT /api/v1/admin/knowledge/{code}
operationId: KnowledgeController_update_v1  |  summary: -
Params: code in:path required string
Body (application/json): UpdateKnowledgeDto = {version*:number, draft*:KnowledgeDraftDto}
Responses: 200: no-content

## POST /api/v1/admin/knowledge/{code}/archive
operationId: KnowledgeController_archive_v1  |  summary: -
Params: code in:path required string
Body (application/json): KnowledgeVersionDto = {version*:number}
Responses: 200: no-content

## GET /api/v1/admin/knowledge/{code}/publication-check
operationId: KnowledgeController_check_v1  |  summary: -
Params: code in:path required string
Responses: 200: no-content

## POST /api/v1/admin/knowledge/{code}/publish
operationId: KnowledgeController_publish_v1  |  summary: -
Params: code in:path required string
Body (application/json): KnowledgeVersionDto = {version*:number}
Responses: 200: no-content

## POST /api/v1/admin/knowledge/{code}/restore
operationId: KnowledgeController_restore_v1  |  summary: -
Params: code in:path required string
Body (application/json): RestoreKnowledgeDto = {version*:number, sourceVersion*:number}
Responses: 200: no-content

## GET /api/v1/admin/knowledge/{code}/revisions
operationId: KnowledgeController_history_v1  |  summary: -
Params: code in:path required string | page in:query ? | pageSize in:query ?
Responses: 200: no-content
