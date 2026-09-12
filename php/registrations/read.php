<?php
/**
 * NSBM Event Hub - Read Registrations Endpoint
 * Student: Returns personal registered events & tickets
 * Admin: Returns participant roster by event or full registration logs
 */

require_once __DIR__ . '/../config/database.php';

$user = requireAuth();
$pdo = getDBConnection();

$isAdmin = ($user['role'] === 'admin');
$view = isset($_GET['view']) ? trim($_GET['view']) : '';
$eventId = isset($_GET['event_id']) ? (int)$_GET['event_id'] : 0;
$status = isset($_GET['status']) ? trim($_GET['status']) : '';
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

try {
    // --------------------------------------------------------
    // ADMIN VIEW: View registrations/participants
    // --------------------------------------------------------
    if ($isAdmin && ($view === 'admin' || $eventId > 0 || isset($_GET['all']))) {
        $whereClauses = [];
        $params = [];

        if ($eventId > 0) {
            $whereClauses[] = 'r.event_id = ?';
            $params[] = $eventId;
        }

        if (!empty($status) && $status !== 'all') {
            $whereClauses[] = 'r.status = ?';
            $params[] = $status;
        }

        if (!empty($search)) {
            $whereClauses[] = '(s.full_name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ? OR r.ticket_code LIKE ? OR e.title LIKE ?)';
            $wildcard = '%' . $search . '%';
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
        }

        $whereSQL = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

        $query = "
            SELECT 
                r.id AS registration_id,
                r.registration_date,
                r.status AS registration_status,
                r.ticket_code,
                s.id AS user_id,
                s.full_name AS student_name,
                s.student_id,
                s.email AS student_email,
                s.phone AS student_phone,
                e.id AS event_id,
                e.title AS event_title,
                e.event_date,
                e.start_time,
                e.venue,
                c.name AS category_name
            FROM registrations r
            JOIN students s ON r.user_id = s.id
            JOIN events e ON r.event_id = e.id
            LEFT JOIN categories c ON e.category_id = c.id
            $whereSQL
            ORDER BY r.registration_date DESC
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $participants = $stmt->fetchAll();

        // If an event ID was specified, also fetch event header summary
        $eventSummary = null;
        if ($eventId > 0) {
            $eventStmt = $pdo->prepare('
                SELECT e.*, c.name as category_name, COUNT(CASE WHEN r.status = "confirmed" THEN 1 END) as confirmed_count 
                FROM events e 
                LEFT JOIN categories c ON e.category_id = c.id
                LEFT JOIN registrations r ON e.id = r.event_id 
                WHERE e.id = ? 
                GROUP BY e.id
            ');
            $eventStmt->execute([$eventId]);
            $eventSummary = $eventStmt->fetch();
        }

        jsonResponse(true, 'Registrations retrieved successfully.', [
            'total'         => count($participants),
            'event'         => $eventSummary,
            'registrations' => $participants
        ]);
    }

    // --------------------------------------------------------
    // STUDENT VIEW: Personal registered events
    // --------------------------------------------------------
    $whereClauses = ['r.user_id = ?'];
    $params = [$user['id']];

    if (!empty($status) && $status !== 'all') {
        $whereClauses[] = 'r.status = ?';
        $params[] = $status;
    }

    $timeFilter = isset($_GET['time_filter']) ? trim($_GET['time_filter']) : 'all';
    if ($timeFilter === 'upcoming') {
        $whereClauses[] = 'e.event_date >= CURDATE()';
    } elseif ($timeFilter === 'past') {
        $whereClauses[] = 'e.event_date < CURDATE()';
    }

    $whereSQL = 'WHERE ' . implode(' AND ', $whereClauses);

    $query = "
        SELECT 
            r.id AS registration_id,
            r.registration_date,
            r.status AS registration_status,
            r.ticket_code,
            e.id AS event_id,
            e.title,
            e.description,
            e.event_date,
            e.start_time,
            e.end_time,
            e.venue,
            e.organizer,
            e.image,
            e.status AS event_status,
            c.name AS category_name,
            c.icon AS category_icon
        FROM registrations r
        JOIN events e ON r.event_id = e.id
        LEFT JOIN categories c ON e.category_id = c.id
        $whereSQL
        ORDER BY e.event_date ASC, e.start_time ASC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $myEvents = $stmt->fetchAll();

    jsonResponse(true, 'My registered events retrieved.', [
        'total'         => count($myEvents),
        'registrations' => $myEvents
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error retrieving registrations: ' . $e->getMessage(), null, 500);
}
