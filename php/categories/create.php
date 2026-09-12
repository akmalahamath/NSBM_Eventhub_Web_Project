<?php
/**
 * NSBM Event Hub - Create Category Endpoint (Admin Only)
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method. Only POST is accepted.', null, 405);
}

$input = getRequestData();
$name = trim($input['name'] ?? '');
$description = trim($input['description'] ?? '');
$icon = trim($input['icon'] ?? 'bi-bookmark-star');

if (empty($name)) {
    jsonResponse(false, 'Category name is required.', null, 400);
}

$pdo = getDBConnection();

try {
    // Check for duplicate category name
    $checkStmt = $pdo->prepare('SELECT id FROM categories WHERE name = ? LIMIT 1');
    $checkStmt->execute([$name]);
    if ($checkStmt->fetch()) {
        jsonResponse(false, 'A category with this name already exists.', null, 409);
    }

    $stmt = $pdo->prepare('INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)');
    $stmt->execute([$name, $description, $icon]);

    $newId = (int)$pdo->lastInsertId();

    jsonResponse(true, 'Category "' . htmlspecialchars($name) . '" created successfully!', [
        'category_id' => $newId
    ], 201);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error creating category: ' . $e->getMessage(), null, 500);
}
