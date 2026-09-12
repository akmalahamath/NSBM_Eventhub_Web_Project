<?php
/**
 * NSBM Event Hub - Update Registration Status Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method.', null, 405);
}

$input = getRequestData();
$registrationId = !empty($input['registration_id']) ? (int)$input['registration_id'] : 0;
$status = trim($input['status'] ?? '');

$allowedStatuses = ['confirmed', 'attended', 'cancelled'];
if ($registrationId <= 0 || !in_array($status, $allowedStatuses)) {
    jsonResponse(false, 'Valid Registration ID and valid status (confirmed, attended, cancelled) are required.', null, 400);
}

$pdo = getDBConnection();

try {
    $stmt = $pdo->prepare('UPDATE registrations SET status = ? WHERE id = ?');
    $stmt->execute([$status, $registrationId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(false, 'Registration not found or status already set.', null, 404);
    }

    jsonResponse(true, 'Registration status updated to ' . ucfirst($status) . ' successfully.');

} catch (PDOException $e) {
    jsonResponse(false, 'Database error updating registration status: ' . $e->getMessage(), null, 500);
}
