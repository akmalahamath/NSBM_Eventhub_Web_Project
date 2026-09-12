<?php
/**
 * NSBM Event Hub - Delete Category Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

$input = getRequestData();
$id = !empty($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

if ($id <= 0) {
    jsonResponse(false, 'Valid Category ID is required.', null, 400);
}

$pdo = getDBConnection();

try {
    $checkStmt = $pdo->prepare('SELECT id, name FROM categories WHERE id = ?');
    $checkStmt->execute([$id]);
    $cat = $checkStmt->fetch();

    if (!$cat) {
        jsonResponse(false, 'Category not found or already deleted.', null, 404);
    }

    $stmt = $pdo->prepare('DELETE FROM categories WHERE id = ?');
    $stmt->execute([$id]);

    jsonResponse(true, 'Category "' . htmlspecialchars($cat['name']) . '" deleted successfully.');

} catch (PDOException $e) {
    jsonResponse(false, 'Database error deleting category: ' . $e->getMessage(), null, 500);
}
