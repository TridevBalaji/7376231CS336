Notification System Design


CORE FEATURES

The notification platform allows students to:
1. Receive real-time notifications about placements, events, and results
2. View their notification history
3. Mark notifications as read/unread
4. Delete old notifications
5. Get count of unread notifications


REST API ENDPOINTS

1. GET /api/notifications
Get all notifications for logged-in student

Headers:
Content-Type: application/json
Authorization: Bearer <token>

Query Parameters:
limit - number of notifications per page (default: 10)
offset - page offset (default: 0)
type - filter by type (Placement, Event, Result)
isRead - filter by read status (true/false)

Response:
Status 200
{
  "success": true,
  "notifications": [
    {
      "id": "d146095a",
      "studentID": 1042,
      "type": "Placement",
      "message": "Acme Corp hiring software engineers",
      "timestamp": "2026-05-08T10:30:00Z",
      "isRead": false
    },
    {
      "id": "81589ada",
      "studentID": 1042,
      "type": "Event",
      "message": "Farewell party on May 15",
      "timestamp": "2026-05-08T09:15:00Z",
      "isRead": true
    }
  ],
  "total": 45
}


2. GET /api/notifications/:id
Get a single notification by ID

Headers:
Content-Type: application/json
Authorization: Bearer <token>

Response:
Status 200
{
  "success": true,
  "notification": {
    "id": "d146095a",
    "studentID": 1042,
    "type": "Result",
    "message": "Mid-semester exam results available",
    "timestamp": "2026-05-08T08:00:00Z",
    "isRead": false,
    "readAt": null
  }
}


3. PATCH /api/notifications/:id/read
Mark a notification as read

Headers:
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "isRead": true
}

Response:
Status 200
{
  "success": true,
  "notification": {
    "id": "d146095a",
    "isRead": true,
    "readAt": "2026-05-08T10:45:00Z"
  }
}


4. DELETE /api/notifications/:id
Delete a notification

Headers:
Content-Type: application/json
Authorization: Bearer <token>

Response:
Status 200
{
  "success": true,
  "message": "Notification deleted"
}


5. GET /api/notifications/count/unread
Get count of unread notifications

Headers:
Content-Type: application/json
Authorization: Bearer <token>

Response:
Status 200
{
  "success": true,
  "unreadCount": 12,
  "byType": {
    "Placement": 5,
    "Event": 3,
    "Result": 4
  }
}


6. POST /api/notifications/send
Send notification to students (Admin only)

Headers:
Content-Type: application/json
Authorization: Bearer <admin_token>

Request Body:
{
  "studentIds": [1042, 1043, 1044],
  "type": "Placement",
  "message": "Placement drive scheduled for May 20",
  "metadata": {
    "companyName": "TechCorp",
    "ctcRange": "12-15 LPA"
  }
}

Response:
Status 201
{
  "success": true,
  "sentCount": 3,
  "notificationIds": ["uuid-1", "uuid-2", "uuid-3"]
}


NOTIFICATION TYPES

Allowed types: Placement, Event, Result


DATABASE SCHEMA

notifications table:
- id (UUID primary key)
- studentID (integer, foreign key)
- type (enum: Placement, Event, Result)
- message (text, max 500 characters)
- isRead (boolean, default false)
- createdAt (timestamp)
- readAt (timestamp, nullable)
- deletedAt (timestamp, nullable)

students table:
- studentID (integer primary key)
- email (string, unique)
- name (string)
- createdAt (timestamp)

Indexes needed:
- Index on (studentID, createdAt) for sorting by date
- Index on (studentID, isRead) for filtering unread


REAL-TIME NOTIFICATIONS

Use WebSocket to push notifications instantly to connected clients.

WebSocket endpoint: ws://localhost:3000/notifications/subscribe

Client sends on connection:
{
  "type": "auth",
  "token": "Bearer <token>"
}

Server sends when new notification arrives:
{
  "type": "notification",
  "notification": {
    "id": "new-uuid",
    "studentID": 1042,
    "type": "Placement",
    "message": "New placement opportunity",
    "timestamp": "2026-05-08T11:00:00Z",
    "isRead": false
  }
}


LOGGING

All API calls are logged to http://4.224.186.213/evaluation-service/logs

Log format:
- stack: backend
- level: info, warn, error, debug
- package: controller, service, middleware, route
- message: descriptive message about the action

Example logs:
Log('backend', 'info', 'controller', 'Fetching notifications for student 1042')
Log('backend', 'warn', 'service', 'Database query slow for student 1042')
Log('backend', 'error', 'route', 'Failed to send notification to 50000 students')


ERROR RESPONSES

Status 400 Bad Request:
{
  "success": false,
  "error": "Invalid notification type provided"
}

Status 401 Unauthorized:
{
  "success": false,
  "error": "Invalid or expired token"
}

Status 404 Not Found:
{
  "success": false,
  "error": "Notification not found"
}

Status 500 Internal Server Error:
{
  "success": false,
  "error": "Failed to fetch notifications from database"
}


PERFORMANCE CONSIDERATIONS

Problem: When database grows to 50,000 students and 5,000,000 notifications, queries become slow.

Solution 1: Add indexes on (studentID, createdAt) for sorting
Solution 2: Implement pagination to limit results per request
Solution 3: Cache recent notifications in Redis
Solution 4: Archive old notifications to separate table

Query to fetch unread notifications efficiently:
SELECT FROM notifications 
WHERE studentID = 1042 AND isRead = false AND deletedAt IS NULL
ORDER BY createdAt DESC
LIMIT 10

This should use the index on (studentID, isRead, createdAt)

