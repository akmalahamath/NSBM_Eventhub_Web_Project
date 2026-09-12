<?php
/**
 * NSBM Event Hub - Check Current Session & Authentication State
 */

require_once __DIR__ . '/../config/database.php';

initSession();

$currentUser = getCurrentUser();

if (!$currentUser) {
    jsonResponse(true, 'User is a guest.', [
        'authenticated' => false,
        'user' => null
    ]);
}

$pdo = getDBConnection();

try {
    if ($currentUser['role'] === 'admin') {
        $stmt = $pdo->prepare('SELECT id, full_name, email, avatar, created_at FROM admins WHERE id = ? LIMIT 1');
    } else {
        $stmt = $pdo->prepare('SELECT id, full_name, student_id, email, phone, avatar, created_at FROM students WHERE id = ? LIMIT 1');
    }
    
    $stmt->execute([$currentUser['id']]);
    $user = $stmt->fetch();

    if (!$user) {
        // User record no longer exists
        session_unset();
        session_destroy();
        jsonResponse(true, 'Session invalid.', [
            'authenticated' => false,
            'user' => null
        ]);
    }

    $userData = [
        'id'         => (int)$user['id'],
        'full_name'  => $user['full_name'],
        'email'      => $user['email'],
        'phone'      => $user['phone'] ?? null,
        'role'       => $currentUser['role'],
        'avatar'     => $user['avatar'],
        'created_at' => $user['created_at']
    ];

    if ($currentUser['role'] === 'student') {
        $userData['student_id'] = $user['student_id'];
    }

    jsonResponse(true, 'User is authenticated.', [
        'authenticated' => true,
        'user' => $userData
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error during session check: ' . $e->getMessage(), null, 500);
}
