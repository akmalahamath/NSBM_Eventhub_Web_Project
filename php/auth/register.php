<?php
/**
 * NSBM Event Hub - Student Registration Endpoint
 */

require_once __DIR__ . '/../config/database.php';

initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method. Only POST is accepted.', null, 405);
}

$input = getRequestData();
$fullName = trim($input['full_name'] ?? '');
$studentId = strtoupper(trim($input['student_id'] ?? ''));
$email = strtolower(trim($input['email'] ?? ''));
$phone = trim($input['phone'] ?? '');
$password = trim($input['password'] ?? '');
$confirmPassword = trim($input['confirm_password'] ?? '');

// Validation
$errors = [];

if (empty($fullName)) {
    $errors[] = 'Full Name is required.';
} elseif (strlen($fullName) < 3) {
    $errors[] = 'Full Name must be at least 3 characters.';
}

if (empty($studentId)) {
    $errors[] = 'Student ID is required.';
}

if (empty($email)) {
    $errors[] = 'Email address is required.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Please provide a valid email address.';
}

if (empty($password)) {
    $errors[] = 'Password is required.';
} elseif (strlen($password) < 6) {
    $errors[] = 'Password must be at least 6 characters long.';
}

if ($password !== $confirmPassword) {
    $errors[] = 'Passwords do not match.';
}

if (!empty($errors)) {
    jsonResponse(false, implode(' ', $errors), null, 400);
}

$pdo = getDBConnection();

try {
    // Check for duplicate email
    $checkEmail = $pdo->prepare('SELECT id FROM students WHERE email = ? LIMIT 1');
    $checkEmail->execute([$email]);
    if ($checkEmail->fetch()) {
        jsonResponse(false, 'An account with this email address already exists.', null, 409);
    }

    // Check for duplicate student ID
    $checkStudentId = $pdo->prepare('SELECT id FROM students WHERE student_id = ? LIMIT 1');
    $checkStudentId->execute([$studentId]);
    if ($checkStudentId->fetch()) {
        jsonResponse(false, 'An account with this Student ID already exists.', null, 409);
    }

    // Hash Password
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    // Insert Student User
    $insertStmt = $pdo->prepare('
        INSERT INTO students (full_name, student_id, email, phone, password)
        VALUES (?, ?, ?, ?, ?)
    ');
    $insertStmt->execute([$fullName, $studentId, $email, $phone, $hashedPassword]);
    $newUserId = (int)$pdo->lastInsertId();

    // Automatically log in the registered user
    $_SESSION['user_id'] = $newUserId;
    $_SESSION['role'] = 'student';
    $_SESSION['email'] = $email;
    $_SESSION['full_name'] = $fullName;
    $_SESSION['student_id'] = $studentId;

    jsonResponse(true, 'Registration successful! Welcome to NSBM Event Hub.', [
        'user' => [
            'id'         => $newUserId,
            'full_name'  => $fullName,
            'student_id' => $studentId,
            'email'      => $email,
            'phone'      => $phone,
            'role'       => 'student'
        ],
        'redirect' => 'student/dashboard.html'
    ], 201);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error during registration: ' . $e->getMessage(), null, 500);
}
