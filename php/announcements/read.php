<?php
/**
 * NSBM Event Hub - Read Announcements Endpoint
 */

require_once __DIR__ . '/../config/database.php';

initSession();
$currentUser = getCurrentUser();
$isAdmin = ($currentUser && $currentUser['role'] === 'admin');

$pdo = getDBConnection();
$announcementId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

try {
    if ($announcementId > 0) {
        $stmt = $pdo->prepare('SELECT * FROM announcements WHERE id = ? LIMIT 1');
        $stmt->execute([$announcementId]);
        $announcement = $stmt->fetch();

        if (!$announcement) {
            jsonResponse(false, 'Announcement not found.', null, 404);
        }

        jsonResponse(true, 'Announcement details retrieved.', $announcement);
    }

    $priority = isset($_GET['priority']) ? trim($_GET['priority']) : '';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $all = isset($_GET['all']) && $isAdmin;

    $whereClauses = [];
    $params = [];

    if (!$all) {
        $whereClauses[] = 'status = "published"';
    }

    if (!empty($priority) && $priority !== 'all') {
        $whereClauses[] = 'priority = ?';
        $params[] = $priority;
    }

    if (!empty($search)) {
        $whereClauses[] = '(title LIKE ? OR content LIKE ?)';
        $wildcard = '%' . $search . '%';
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    $whereSQL = !empty($whereClauses) ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

    $query = "
        SELECT * FROM announcements
        $whereSQL
        ORDER BY 
            CASE priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END ASC,
            created_at DESC
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $announcements = $stmt->fetchAll();

    jsonResponse(true, 'Announcements retrieved successfully.', [
        'total'         => count($announcements),
        'announcements' => $announcements
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error retrieving announcements: ' . $e->getMessage(), null, 500);
}
