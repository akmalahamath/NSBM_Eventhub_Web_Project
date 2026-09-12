<?php
/**
 * NSBM Event Hub - Event Registration Endpoint (Student)
 * Validates authentication, deadline, capacity limit, and duplicate registration
 */

require_once __DIR__ . '/../config/database.php';

$user = requireAuth(); // Must be logged in

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method. Only POST is accepted.', null, 405);
}

$input = getRequestData();
$eventId = !empty($input['event_id']) ? (int)$input['event_id'] : 0;

if ($eventId <= 0) {
    jsonResponse(false, 'Valid Event ID is required.', null, 400);
}

$pdo = getDBConnection();

try {
    // 1. Fetch Event with Current Registration Count in a Transaction
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('
        SELECT 
            e.*,
            COUNT(CASE WHEN r.status = "confirmed" THEN 1 END) AS current_confirmed
        FROM events e
        LEFT JOIN registrations r ON e.id = r.event_id
        WHERE e.id = ?
        GROUP BY e.id
        FOR UPDATE
    ');
    $stmt->execute([$eventId]);
    $event = $stmt->fetch();

    if (!$event) {
        $pdo->rollBack();
        jsonResponse(false, 'Event not found.', null, 404);
    }

    // 2. Check Event Status
    if ($event['status'] === 'cancelled') {
        $pdo->rollBack();
        jsonResponse(false, 'This event has been cancelled.', null, 400);
    }

    // 3. Check Registration Deadline
    if (strtotime($event['registration_deadline']) < time()) {
        $pdo->rollBack();
        jsonResponse(false, 'Registration deadline for this event has passed (' . date('M d, Y h:i A', strtotime($event['registration_deadline'])) . ').', null, 400);
    }

    // 4. Check Capacity
    $currentCount = (int)$event['current_confirmed'];
    $maxCapacity = (int)$event['max_participants'];
    if ($currentCount >= $maxCapacity) {
        $pdo->rollBack();
        jsonResponse(false, 'This event has reached full capacity (' . $maxCapacity . ' seats).', null, 400);
    }

    // 5. Check if user is already registered
    $checkReg = $pdo->prepare('SELECT id, status, ticket_code FROM registrations WHERE user_id = ? AND event_id = ? LIMIT 1');
    $checkReg->execute([$user['id'], $eventId]);
    $existingReg = $checkReg->fetch();

    $ticketCode = 'TKT-NSBM-' . strtoupper(substr(md5(uniqid((string)mt_rand(), true)), 0, 8));

    if ($existingReg) {
        if ($existingReg['status'] === 'confirmed') {
            $pdo->rollBack();
            jsonResponse(false, 'You are already registered for this event! Ticket: ' . $existingReg['ticket_code'], [
                'ticket_code' => $existingReg['ticket_code']
            ], 409);
        } else {
            // Reactivate previous cancelled registration
            $updateReg = $pdo->prepare('UPDATE registrations SET status = "confirmed", registration_date = NOW(), ticket_code = ? WHERE id = ?');
            $updateReg->execute([$ticketCode, $existingReg['id']]);
            $regId = $existingReg['id'];
        }
    } else {
        // Insert new registration
        $insertReg = $pdo->prepare('
            INSERT INTO registrations (user_id, event_id, status, ticket_code)
            VALUES (?, ?, "confirmed", ?)
        ');
        $insertReg->execute([$user['id'], $eventId, $ticketCode]);
        $regId = (int)$pdo->lastInsertId();
    }

    $pdo->commit();

    jsonResponse(true, 'Registration successful! Your digital pass is confirmed.', [
        'registration_id' => $regId,
        'ticket_code'     => $ticketCode,
        'event_title'     => $event['title'],
        'event_date'      => $event['event_date'],
        'venue'           => $event['venue']
    ], 201);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, 'Database error during event registration: ' . $e->getMessage(), null, 500);
}
