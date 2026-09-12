<?php
/**
 * NSBM Event Hub - Read Categories Endpoint
 * Returns all categories along with the count of active and total events in each category
 */

require_once __DIR__ . '/../config/database.php';

$pdo = getDBConnection();

$categoryId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

try {
    if ($categoryId > 0) {
        $stmt = $pdo->prepare('
            SELECT 
                c.*,
                COUNT(e.id) AS total_events,
                COUNT(CASE WHEN e.status = "upcoming" THEN 1 END) AS upcoming_events
            FROM categories c
            LEFT JOIN events e ON c.id = e.category_id
            WHERE c.id = ?
            GROUP BY c.id
        ');
        $stmt->execute([$categoryId]);
        $category = $stmt->fetch();

        if (!$category) {
            jsonResponse(false, 'Category not found.', null, 404);
        }

        jsonResponse(true, 'Category details retrieved.', $category);
    }

    $stmt = $pdo->query('
        SELECT 
            c.*,
            COUNT(e.id) AS total_events,
            COUNT(CASE WHEN e.status = "upcoming" THEN 1 END) AS upcoming_events
        FROM categories c
        LEFT JOIN events e ON c.id = e.category_id
        GROUP BY c.id
        ORDER BY c.name ASC
    ');
    $categories = $stmt->fetchAll();

    jsonResponse(true, 'Categories retrieved successfully.', [
        'total'      => count($categories),
        'categories' => $categories
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error retrieving categories: ' . $e->getMessage(), null, 500);
}
