<?php
/**
 * NSBM Event Hub - Update Category Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

$input = getRequestData();
$id = !empty($input['id']) ? (int)$input['id'] : 0;
$name = trim($input['name'] ?? '');
$description = trim($input['description'] ?? '');
$icon = trim($input['icon'] ?? 'bi-bookmark-star');

if ($id <= 0) {
    jsonResponse(false, 'Valid Category ID is required.', null, 400);
}

if (empty($name)) {
    jsonResponse(false, 'Category name is required.', null, 400);
}

$pdo = getDBConnection();

try {
    // Check if category exists
    $checkStmt = $pdo->prepare('SELECT id FROM categories WHERE id = ?');
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonResponse(false, 'Category not found.', null, 404);
    }

    // Check duplicate name with another category
    $dupStmt = $pdo->prepare('SELECT id FROM categories WHERE name = ? AND id != ? LIMIT 1');
    $dupStmt->execute([$name, $id]);
    if ($dupStmt->fetch()) {
        jsonResponse(false, 'Another category with this name already exists.', null, 409);
    }

    $stmt = $pdo->prepare('UPDATE categories SET name = ?, description = ?, icon = ? WHERE id = ?');
    $stmt->execute([$name, $description, $icon, $id]);

    jsonResponse(true, 'Category updated successfully!', [
        'category_id' => $id
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error updating category: ' . $e->getMessage(), null, 500);
}
