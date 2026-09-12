<?php
/**
 * NSBM Event Hub - Update Event Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonResponse(false, 'Invalid request method.', null, 405);
}

// Support both JSON and multipart/form-data (for file uploads)
$input = $_POST ?: getRequestData();

$eventId = !empty($input['id']) ? (int)$input['id'] : 0;
if ($eventId <= 0) {
    jsonResponse(false, 'Valid Event ID is required.', null, 400);
}

$title = trim($input['title'] ?? '');
$categoryId = !empty($input['category_id']) ? (int)$input['category_id'] : null;
$description = trim($input['description'] ?? '');
$eventDate = trim($input['event_date'] ?? '');
$startTime = trim($input['start_time'] ?? '');
$endTime = trim($input['end_time'] ?? '');
$venue = trim($input['venue'] ?? '');
$organizer = trim($input['organizer'] ?? '');
$maxParticipants = !empty($input['max_participants']) ? (int)$input['max_participants'] : 100;
$registrationDeadline = trim($input['registration_deadline'] ?? '');
$image = null; // will be resolved below
$status = trim($input['status'] ?? 'upcoming');

// Validation
$errors = [];
if (empty($title)) $errors[] = 'Event title is required.';
if (empty($description)) $errors[] = 'Event description is required.';
if (empty($eventDate)) $errors[] = 'Event date is required.';
if (empty($startTime)) $errors[] = 'Start time is required.';
if (empty($endTime)) $errors[] = 'End time is required.';
if (empty($venue)) $errors[] = 'Venue is required.';
if (empty($organizer)) $errors[] = 'Organizer is required.';
if ($maxParticipants <= 0) $errors[] = 'Maximum participants must be at least 1.';

if (!empty($errors)) {
    jsonResponse(false, implode(' ', $errors), null, 400);
}

$pdo = getDBConnection();

try {
    // Check if event exists
    $checkStmt = $pdo->prepare('SELECT id, image FROM events WHERE id = ?');
    $checkStmt->execute([$eventId]);
    $existing = $checkStmt->fetch();

    if (!$existing) {
        jsonResponse(false, 'Event not found.', null, 404);
    }

    // Handle new image upload
    if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../../uploads/events/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $fileInfo = pathinfo($_FILES['image_file']['name']);
        $ext = strtolower($fileInfo['extension']);
        $allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (in_array($ext, $allowedTypes)) {
            $filename = uniqid('event_') . '.' . $ext;
            $destination = $uploadDir . $filename;
            if (move_uploaded_file($_FILES['image_file']['tmp_name'], $destination)) {
                $image = 'uploads/events/' . $filename;
            }
        }
    }

    // If no new file uploaded, keep existing image
    if (empty($image)) {
        $image = $existing['image'];
    }

    if (empty($registrationDeadline)) {
        $registrationDeadline = date('Y-m-d H:i:s', strtotime($eventDate . ' ' . $startTime . ' -1 day'));
    } else {
        $parsedTime = strtotime($registrationDeadline);
        $registrationDeadline = ($parsedTime !== false) ? date('Y-m-d H:i:s', $parsedTime) : date('Y-m-d H:i:s', strtotime($eventDate . ' ' . $startTime . ' -1 day'));
    }

    $stmt = $pdo->prepare('
        UPDATE events SET
            category_id = ?,
            title = ?,
            description = ?,
            event_date = ?,
            start_time = ?,
            end_time = ?,
            venue = ?,
            organizer = ?,
            max_participants = ?,
            registration_deadline = ?,
            image = ?,
            status = ?
        WHERE id = ?
    ');

    $stmt->execute([
        $categoryId, $title, $description, $eventDate, $startTime, $endTime,
        $venue, $organizer, $maxParticipants, $registrationDeadline, $image, $status,
        $eventId
    ]);

    jsonResponse(true, 'Event updated successfully!', [
        'event_id' => $eventId
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error updating event: ' . $e->getMessage(), null, 500);
}
