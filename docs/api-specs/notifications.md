# API GROUP: notifications (6 ops)

## GET /api/v1/notifications
operationId: NotificationsController_list_v1  |  summary: Own notifications (paginated, optional unread filter)
Params: page in:query number | pageSize in:query number | unread in:query boolean
Responses: 200: no-content

## GET /api/v1/notifications/preferences
operationId: NotificationsController_preferences_v1  |  summary: Effective preferences (missing row = enabled)
Responses: 200: no-content

## PUT /api/v1/notifications/preferences
operationId: NotificationsController_setPreference_v1  |  summary: Upsert one preference
Body (application/json): SetPreferenceDto = {category*:string enum:['system', 'task', 'session', 'evaluation', 'announcement', 'recruitment', 'kpi', 'salary', 'certificate'], enabled*:boolean}
Responses: 200: no-content

## POST /api/v1/notifications/read-all
operationId: NotificationsController_markAllRead_v1  |  summary: Mark all as read
Responses: 200: no-content

## GET /api/v1/notifications/unread-count
operationId: NotificationsController_unreadCount_v1  |  summary: Unread badge count
Responses: 200: no-content

## POST /api/v1/notifications/{id}/read
operationId: NotificationsController_markRead_v1  |  summary: Mark one as read (ownership enforced)
Params: id in:path required string
Responses: 204: no-content
