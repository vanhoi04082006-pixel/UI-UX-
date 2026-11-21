# API GROUP: github (13 ops)

## GET /api/v1/github/callback
operationId: GithubController_callback_v1  |  summary: -
Params: code in:query required string | state in:query required string
Responses: 200: no-content

## POST /api/v1/github/connect
operationId: GithubController_connect_v1  |  summary: -
Responses: 201: no-content

## DELETE /api/v1/github/me
operationId: GithubController_disconnect_v1  |  summary: -
Responses: 200: no-content

## GET /api/v1/github/me
operationId: GithubController_status_v1  |  summary: -
Responses: 200: no-content

## GET /api/v1/github/repository-account
operationId: GithubController_repositoryAccountStatus_v1  |  summary: -
Responses: 200: no-content

## POST /api/v1/github/repository-account
operationId: GithubController_selectRepositoryAccount_v1  |  summary: -
Responses: 201: no-content

## GET /api/v1/sessions/{id}/github
operationId: GithubController_statusRepo_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/sessions/{id}/github/activity
operationId: GithubController_githubActivity_v1  |  summary: -
Params: id in:path required string | page in:query number | pageSize in:query number
Responses: 200: no-content

## POST /api/v1/sessions/{id}/github/invite
operationId: GithubController_invite_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/sessions/{id}/github/members/{userId}/invite
operationId: GithubController_inviteMember_v1  |  summary: -
Params: id in:path required string | userId in:path required string
Responses: 201: no-content

## POST /api/v1/sessions/{id}/github/provision
operationId: GithubController_provision_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/sessions/{id}/github/reconcile
operationId: GithubController_reconcile_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/sessions/{id}/github/webhook
operationId: GithubController_configureWebhook_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content
