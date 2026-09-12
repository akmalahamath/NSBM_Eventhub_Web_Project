<?php
/**
 * NSBM Event Hub - Cancel Registration Endpoint
 */

require_once __DIR__ . '/../config/database.php';

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method.', null, 405);
}

$input = getRequestData();
$registrationId = !empty($input['registration_id']) ? (int)$input['registration_id'] : 0;
$eventId = !empty($input['event_id']) ? (int)$input['event_id'] : 0;

if ($registrationId <= 0 && $eventId <= 0) {
    jsonResponse(false, 'Registration ID or Event ID is required.', null, 400);
}

$pdo = getDBConnection();

try {
    if ($registrationId > 0) {
        if ($user['role'] === 'admin') {
            $stmt = $pdo->prepare('UPDATE registrations SET status = "cancelled" WHERE id = ?');
            $stmt->execute([$registrationId]);
        } else {
            $stmt = $pdo->prepare('UPDATE registrations SET status = "cancelled" WHERE id = ? AND user_id = ?');
            $stmt->execute([$registrationId, $user['id']]);
        }
    } else {
        $stmt = $pdo->prepare('UPDATE registrations SET status = "cancelled" WHERE event_id = ? AND user_id = ?');
        $stmt->execute([$eventId, $user['id']]);
    }

    if ($stmt->rowCount() === 0) {
        jsonResponse(false, 'Registration not found or already cancelled.', null, 404);
    }

    jsonResponse(true, 'Registration has been cancelled successfully.');

} catch (PDOException $e) {
    jsonResponse(false, 'Database error cancelling registration: ' . $e->getMessage(), null, 500);
}
