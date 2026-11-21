# API GROUP: auth (6 ops)

## POST /api/v1/auth/change-password
operationId: AuthController_changePassword_v1  |  summary: -
Body (application/json): ChangePasswordDto = {}
Responses: 201: no-content

## POST /api/v1/auth/login
operationId: AuthController_login_v1  |  summary: Login → access token + HttpOnly refresh cookie
Body (application/json): LoginDto = {email*:string, password*:string}
Responses: 200: no-content

## POST /api/v1/auth/logout
operationId: AuthController_logout_v1  |  summary: Revoke refresh token + clear cookie (204)
Responses: 204: no-content

## GET /api/v1/auth/me
operationId: AuthController_me_v1  |  summary: Fresh principal from DB (roles + permissions)
Responses: 200: no-content

## POST /api/v1/auth/refresh
operationId: AuthController_refresh_v1  |  summary: Rotate refresh token (family reuse detection)
Responses: 200: no-content

## POST /api/v1/auth/register
operationId: AuthController_register_v1  |  summary: Create an intern-only account; login separately to start recruitment
Body (application/json): RegisterDto = {}
Responses: 201: no-content
