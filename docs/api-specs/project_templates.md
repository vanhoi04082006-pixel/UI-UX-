# API GROUP: project templates (17 ops)

## GET /api/v1/intern/me/projects/{id}/learning-package
operationId: TemplatesController_ownPackage_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/project-changes/{id}/apply
operationId: TemplatesController_apply_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content

## GET /api/v1/project-templates
operationId: TemplatesController_list_v1  |  summary: -
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## POST /api/v1/project-templates
operationId: TemplatesController_create_v1  |  summary: -
Body (application/json): CreateTemplateDto = {learningPackage:object, assessment:object}
Responses: 201: no-content

## GET /api/v1/project-templates/{id}
operationId: TemplatesController_get_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## PATCH /api/v1/project-templates/{id}
operationId: TemplatesController_update_v1  |  summary: -
Params: id in:path required string
Body (application/json): UpdateTemplateDto = {assessment:object}
Responses: 200: no-content

## GET /api/v1/project-templates/{id}/assessment
operationId: TemplatesController_assessment_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/project-templates/{id}/revisions
operationId: TemplatesController_history_v1  |  summary: -
Params: id in:path required string | page in:query number | pageSize in:query number
Responses: 200: no-content

## GET /api/v1/project-templates/{id}/revisions/{version}
operationId: TemplatesController_revision_v1  |  summary: -
Params: id in:path required string | version in:path required number
Responses: 200: no-content

## GET /api/v1/project-templates/{id}/revisions/{version}/assessment
operationId: TemplatesController_revisionAssessment_v1  |  summary: -
Params: id in:path required string | version in:path required number
Responses: 200: no-content

## POST /api/v1/project-templates/{id}/start
operationId: TemplatesController_start_v1  |  summary: -
Params: id in:path required string
Body (application/json): StartTemplateDto = {}
Responses: 201: no-content

## GET /api/v1/projects/{id}/changes
operationId: TemplatesController_changes_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/projects/{id}/changes
operationId: TemplatesController_propose_v1  |  summary: -
Params: id in:path required string
Body (application/json): ChangeRequestDto = {}
Responses: 201: no-content

## GET /api/v1/projects/{id}/template-assessment
operationId: TemplatesController_projectAssessment_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/projects/{id}/template-context
operationId: TemplatesController_context_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/tasks/{id}/spec
operationId: TemplatesController_spec_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/tasks/{id}/spec/source
operationId: TemplatesController_sourceSpec_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content
