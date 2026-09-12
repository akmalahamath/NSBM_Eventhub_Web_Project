<?php
/**
 * NSBM Event Hub - Delete Announcement Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

$input = getRequestData();
$id = !empty($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

if ($id <= 0) {
    jsonResponse(false, 'Valid Announcement ID is required.', null, 400);
}

$pdo = getDBConnection();

try {
    $checkStmt = $pdo->prepare('SELECT id, title FROM announcements WHERE id = ?');
    $checkStmt->execute([$id]);
    $ann = $checkStmt->fetch();

    if (!$ann) {
        jsonResponse(false, 'Announcement not found or already deleted.', null, 404);
    }

    $stmt = $pdo->prepare('DELETE FROM announcements WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(true, 'Announcement deleted successfully.');

} catch (PDOException $e) {
    jsonResponse(false, 'Database error deleting announcement: ' . $e->getMessage(), null, 500);
}
