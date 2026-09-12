<?php
/**
 * NSBM Event Hub - Update Announcement Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

$input = getRequestData();
$id = !empty($input['id']) ? (int)$input['id'] : 0;
$title = trim($input['title'] ?? '');
$content = trim($input['content'] ?? '');
$priority = trim($input['priority'] ?? 'medium');
$status = trim($input['status'] ?? 'published');

if ($id <= 0) {
    jsonResponse(false, 'Valid Announcement ID is required.', null, 400);
}

if (empty($title)) {
    jsonResponse(false, 'Announcement title is required.', null, 400);
}

if (empty($content)) {
    jsonResponse(false, 'Announcement content is required.', null, 400);
}

$pdo = getDBConnection();

try {
    $checkStmt = $pdo->prepare('SELECT id FROM announcements WHERE id = ?');
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonResponse(false, 'Announcement not found.', null, 404);
    }

    $stmt = $pdo->prepare('
        UPDATE announcements SET
            title = ?,
            content = ?,
            priority = ?,
            status = ?
        WHERE id = ?
    ');
    $stmt->execute([$title, $content, $priority, $status, $id]);

    jsonResponse(true, 'Announcement updated successfully!', [
        'announcement_id' => $id
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error updating announcement: ' . $e->getMessage(), null, 500);
}
