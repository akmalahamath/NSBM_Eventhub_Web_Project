<?php
/**
 * NSBM Event Hub - Delete Event Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

$input = getRequestData();
$eventId = !empty($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

if ($eventId <= 0) {
    jsonResponse(false, 'Valid Event ID is required.', null, 400);
}

$pdo = getDBConnection();

try {
    // Check if event exists
    $checkStmt = $pdo->prepare('SELECT id, title FROM events WHERE id = ?');
    $checkStmt->execute([$eventId]);
    $event = $checkStmt->fetch();

    if (!$event) {
        jsonResponse(false, 'Event not found or already deleted.', null, 404);
    }

    $deleteStmt = $pdo->prepare('DELETE FROM events WHERE id = ?');
    $deleteStmt->execute([$eventId]);

    jsonResponse(true, 'Event "' . htmlspecialchars($event['title']) . '" deleted successfully.');

} catch (PDOException $e) {
    jsonResponse(false, 'Database error deleting event: ' . $e->getMessage(), null, 500);
}
