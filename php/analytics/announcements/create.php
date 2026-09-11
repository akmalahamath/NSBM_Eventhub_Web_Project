<?php
/**
 * NSBM Event Hub - Create Announcement Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method.', null, 405);
}

$input = getRequestData();
$title = trim($input['title'] ?? '');
$content = trim($input['content'] ?? '');
$priority = trim($input['priority'] ?? 'medium');
$status = trim($input['status'] ?? 'published');

if (empty($title)) {
    jsonResponse(false, 'Announcement title is required.', null, 400);
}

if (empty($content)) {
    jsonResponse(false, 'Announcement content is required.', null, 400);
}

$allowedPriorities = ['low', 'medium', 'high', 'urgent'];
if (!in_array($priority, $allowedPriorities)) {
    $priority = 'medium';
}

$allowedStatuses = ['published', 'draft'];
if (!in_array($status, $allowedStatuses)) {
    $status = 'published';
}

$pdo = getDBConnection();

try {
    $stmt = $pdo->prepare('
        INSERT INTO announcements (title, content, priority, status)
        VALUES (?, ?, ?, ?)
    ');
    $stmt->execute([$title, $content, $priority, $status]);

    $newId = (int)$pdo->lastInsertId();

    jsonResponse(true, 'Announcement created successfully!', [
        'announcement_id' => $newId
    ], 201);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error creating announcement: ' . $e->getMessage(), null, 500);
}
