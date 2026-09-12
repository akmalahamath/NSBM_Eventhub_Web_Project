<?php
/**
 * NSBM Event Hub - User & Admin Login Endpoint
 */

require_once __DIR__ . '/../config/database.php';

initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method. Only POST is accepted.', null, 405);
}

$input = getRequestData();
$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');
$loginType = trim($input['login_type'] ?? 'student'); // 'student' or 'admin'

// Validation
if (empty($email) || empty($password)) {
    jsonResponse(false, 'Please provide both email and password.', null, 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Please enter a valid email address.', null, 400);
}

if (!in_array($loginType, ['student', 'admin'])) {
    jsonResponse(false, 'Invalid login type.', null, 400);
}

$pdo = getDBConnection();

try {
    if ($loginType === 'admin') {
        $stmt = $pdo->prepare('SELECT id, full_name, email, password, avatar FROM admins WHERE email = ? LIMIT 1');
    } else {
        $stmt = $pdo->prepare('SELECT id, full_name, student_id, email, phone, password, avatar FROM students WHERE email = ? LIMIT 1');
    }
    
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(false, 'Invalid email or password.', null, 401);
    }

    $passwordMatches = password_verify($password, $user['password']);

    // Auto-hash upgrade: If you manually insert a plain text password in phpMyAdmin,
    // this will detect it, allow the login, and automatically convert it to a secure hash!
    if (!$passwordMatches && $password === $user['password']) {
        $passwordMatches = true;
        $newHash = password_hash($password, PASSWORD_BCRYPT);
        
        if ($loginType === 'admin') {
            $updateStmt = $pdo->prepare('UPDATE admins SET password = ? WHERE id = ?');
        } else {
            $updateStmt = $pdo->prepare('UPDATE students SET password = ? WHERE id = ?');
        }
        $updateStmt->execute([$newHash, $user['id']]);
    }

    if (!$passwordMatches) {
        jsonResponse(false, 'Invalid email or password.', null, 401);
    }

    // Set Session Variables
    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['role'] = $loginType;
    $_SESSION['email'] = $user['email'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['student_id'] = $user['student_id'] ?? null; // Admin won't have student_id

    // Determine redirect destination
    $redirect = ($loginType === 'admin') ? 'admin/dashboard.html' : 'student/dashboard.html';

    $userData = [
        'id'         => (int)$user['id'],
        'full_name'  => $user['full_name'],
        'email'      => $user['email'],
        'phone'      => $user['phone'] ?? null,
        'role'       => $loginType,
        'avatar'     => $user['avatar']
    ];

    if ($loginType === 'student') {
        $userData['student_id'] = $user['student_id'];
    }

    jsonResponse(true, 'Login successful! Welcome back, ' . htmlspecialchars($user['full_name']) . '.', [
        'user' => $userData,
        'redirect' => $redirect
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error during authentication: ' . $e->getMessage(), null, 500);
}
