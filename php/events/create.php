<?php
/**
 * NSBM Event Hub - Create Event Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method. Only POST is accepted.', null, 405);
}

$input = getRequestData();

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
$status = trim($input['status'] ?? 'upcoming');
$image = trim($input['image'] ?? '');

// Handle image upload if a file was sent
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/../../uploads/events/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    $fileInfo = pathinfo($_FILES['image']['name']);
    $ext = strtolower($fileInfo['extension']);
    $allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (in_array($ext, $allowedTypes)) {
        $filename = uniqid('event_') . '.' . $ext;
        $destination = $uploadDir . $filename;
        if (move_uploaded_file($_FILES['image']['tmp_name'], $destination)) {
            // Store as a relative path from the site root (no leading slash)
            // so it works on XAMPP subdirectory installs like /NSBM Event Hub Akmal/
            $image = 'uploads/events/' . $filename;
        }
    }
}
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
if (empty($registrationDeadline)) {
    // Default deadline to 1 day before event
    $registrationDeadline = date('Y-m-d H:i:s', strtotime($eventDate . ' ' . $startTime . ' -1 day'));
} else {
    $parsedTime = strtotime($registrationDeadline);
    $registrationDeadline = ($parsedTime !== false) ? date('Y-m-d H:i:s', $parsedTime) : date('Y-m-d H:i:s', strtotime($eventDate . ' ' . $startTime . ' -1 day'));
}

if (!empty($errors)) {
    jsonResponse(false, implode(' ', $errors), null, 400);
}

// Leave image empty — the frontend will apply its own fallback per context

$pdo = getDBConnection();

try {
    $stmt = $pdo->prepare('
        INSERT INTO events (
            category_id, title, description, event_date, start_time, end_time,
            venue, organizer, max_participants, registration_deadline, image, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $stmt->execute([
        $categoryId, $title, $description, $eventDate, $startTime, $endTime,
        $venue, $organizer, $maxParticipants, $registrationDeadline, $image, $status
    ]);

    $newEventId = (int)$pdo->lastInsertId();

    jsonResponse(true, 'Event created successfully!', [
        'event_id' => $newEventId
    ], 201);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error creating event: ' . $e->getMessage(), null, 500);
}
