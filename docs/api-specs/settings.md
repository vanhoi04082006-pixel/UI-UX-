# API GROUP: settings (2 ops)

## GET /api/v1/settings
operationId: SettingsController_list_v1  |  summary: All system settings (settings.read)
Responses: 200: no-content

## PATCH /api/v1/settings
operationId: SettingsController_update_v1  |  summary: Upsert one setting (settings.update; audited)
Body (application/json): UpdateSettingDto = {}
Responses: 200: no-content
