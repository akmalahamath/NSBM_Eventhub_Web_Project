<?php
/**
 * NSBM Event Hub - Read Events Endpoint
 * Supports single event retrieval, search, multi-filter, category filter, and capacity computation
 */

require_once __DIR__ . '/../config/database.php';

initSession();
$currentUser = getCurrentUser();
$currentUserId = $currentUser ? (int)$currentUser['id'] : 0;

$pdo = getDBConnection();

// Check if a single event ID is requested
$eventId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

try {
    if ($eventId > 0) {
        $query = "
            SELECT 
                e.*,
                c.name AS category_name,
                c.icon AS category_icon,
                COUNT(CASE WHEN r.status = 'confirmed' THEN 1 END) AS registered_count,
                MAX(CASE WHEN r.user_id = ? AND r.status = 'confirmed' THEN 1 ELSE 0 END) AS is_user_registered,
                MAX(CASE WHEN r.user_id = ? AND r.status = 'confirmed' THEN r.ticket_code ELSE NULL END) AS user_ticket_code
            FROM events e
            LEFT JOIN categories c ON e.category_id = c.id
            LEFT JOIN registrations r ON e.id = r.event_id
            WHERE e.id = ?
            GROUP BY e.id, c.id
            LIMIT 1
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute([$currentUserId, $currentUserId, $eventId]);
        $event = $stmt->fetch();

        if (!$event) {
            jsonResponse(false, 'Event not found.', null, 404);
        }

        // Enrich event metrics
        $registered = (int)$event['registered_count'];
        $max = (int)$event['max_participants'];
        $available = max(0, $max - $registered);
        $occupancy = $max > 0 ? min(100, round(($registered / $max) * 100, 1)) : 0;
        
        $deadlinePassed = strtotime($event['registration_deadline']) < time();
        $isFull = $registered >= $max;

        $event['registered_count'] = $registered;
        $event['max_participants'] = $max;
        $event['available_seats'] = $available;
        $event['occupancy_percent'] = $occupancy;
        $event['is_deadline_passed'] = $deadlinePassed;
        $event['is_full'] = $isFull;
        $event['is_user_registered'] = (bool)$event['is_user_registered'];

        jsonResponse(true, 'Event details retrieved successfully.', $event);
    }

    // Otherwise, handle list / search / filter query
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $categoryId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';
    $timeFilter = isset($_GET['time_filter']) ? trim($_GET['time_filter']) : 'all';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $sort = isset($_GET['sort']) ? trim($_GET['sort']) : 'date_asc';

    $whereClauses = [];
    $params = [$currentUserId];

    if (!empty($search)) {
        $whereClauses[] = '(e.title LIKE ? OR e.description LIKE ? OR e.venue LIKE ? OR e.organizer LIKE ?)';
        $searchWildcard = '%' . $search . '%';
        $params[] = $searchWildcard;
        $params[] = $searchWildcard;
        $params[] = $searchWildcard;
        $params[] = $searchWildcard;
    }

    if ($categoryId > 0) {
        $whereClauses[] = 'e.category_id = ?';
        $params[] = $categoryId;
    }

    if (!empty($status) && $status !== 'all') {
        $whereClauses[] = 'e.status = ?';
        $params[] = $status;
    }

    if ($timeFilter === 'upcoming') {
        $whereClauses[] = 'e.event_date >= CURDATE()';
    } elseif ($timeFilter === 'today') {
        $whereClauses[] = 'e.event_date = CURDATE()';
    } elseif ($timeFilter === 'this_week') {
        $whereClauses[] = 'YEARWEEK(e.event_date, 1) = YEARWEEK(CURDATE(), 1)';
    } elseif ($timeFilter === 'this_month') {
        $whereClauses[] = 'YEAR(e.event_date) = YEAR(CURDATE()) AND MONTH(e.event_date) = MONTH(CURDATE())';
    } elseif ($timeFilter === 'past') {
        $whereClauses[] = 'e.event_date < CURDATE()';
    }

    $whereSQL = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

    $orderBySQL = 'ORDER BY e.event_date ASC, e.start_time ASC';
    if ($sort === 'date_desc') {
        $orderBySQL = 'ORDER BY e.event_date DESC, e.start_time DESC';
    } elseif ($sort === 'popular') {
        $orderBySQL = 'ORDER BY registered_count DESC, e.event_date ASC';
    } elseif ($sort === 'title_asc') {
        $orderBySQL = 'ORDER BY e.title ASC';
    }

    $query = "
        SELECT 
            e.*,
            c.name AS category_name,
            c.icon AS category_icon,
            COUNT(CASE WHEN r.status = 'confirmed' THEN 1 END) AS registered_count,
            MAX(CASE WHEN r.user_id = ? AND r.status = 'confirmed' THEN 1 ELSE 0 END) AS is_user_registered
        FROM events e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN registrations r ON e.id = r.event_id
        $whereSQL
        GROUP BY e.id, c.id
        $orderBySQL
        LIMIT $limit OFFSET $offset
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $events = $stmt->fetchAll();

    // Format metrics for each event
    foreach ($events as &$event) {
        $registered = (int)$event['registered_count'];
        $max = (int)$event['max_participants'];
        $available = max(0, $max - $registered);
        $occupancy = $max > 0 ? min(100, round(($registered / $max) * 100, 1)) : 0;
        
        $deadlinePassed = strtotime($event['registration_deadline']) < time();
        $isFull = $registered >= $max;

        $event['registered_count'] = $registered;
        $event['max_participants'] = $max;
        $event['available_seats'] = $available;
        $event['occupancy_percent'] = $occupancy;
        $event['is_deadline_passed'] = $deadlinePassed;
        $event['is_full'] = $isFull;
        $event['is_user_registered'] = (bool)$event['is_user_registered'];
    }

    jsonResponse(true, 'Events retrieved successfully.', [
        'total'  => count($events),
        'events' => $events
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error retrieving events: ' . $e->getMessage(), null, 500);
}
