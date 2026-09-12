<?php
/**
 * NSBM Event Hub - Update Profile & Password Endpoint
 */

require_once __DIR__ . '/../config/database.php';

$user = requireAuth();
$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Invalid request method.', null, 405);
}

$input = getRequestData();
$action = trim($input['action'] ?? 'profile');

$tableName = ($user['role'] === 'admin') ? 'admins' : 'students';

try {
    if ($action === 'password') {
        $currentPassword = trim($input['current_password'] ?? '');
        $newPassword = trim($input['new_password'] ?? '');
        $confirmPassword = trim($input['confirm_password'] ?? '');

        if (empty($currentPassword) || empty($newPassword)) {
            jsonResponse(false, 'Current password and new password are required.', null, 400);
        }

        if (strlen($newPassword) < 6) {
            jsonResponse(false, 'New password must be at least 6 characters long.', null, 400);
        }

        if ($newPassword !== $confirmPassword) {
            jsonResponse(false, 'New passwords do not match.', null, 400);
        }

        // Fetch current password hash
        $stmt = $pdo->prepare("SELECT password FROM $tableName WHERE id = ?");
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($currentPassword, $row['password'])) {
            jsonResponse(false, 'Current password is incorrect.', null, 401);
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        $updateStmt = $pdo->prepare("UPDATE $tableName SET password = ? WHERE id = ?");
        $updateStmt->execute([$newHash, $user['id']]);

        jsonResponse(true, 'Password updated successfully!');
    }

    // Default: update profile details
    $fullName = trim($input['full_name'] ?? '');
    $phone = trim($input['phone'] ?? '');

    if (empty($fullName)) {
        jsonResponse(false, 'Full Name is required.', null, 400);
    }

    if ($user['role'] === 'student') {
        $studentId = trim($input['student_id'] ?? '');
        
        // Check unique student ID if changed
        if (!empty($studentId) && $studentId !== ($user['student_id'] ?? '')) {
            $checkId = $pdo->prepare('SELECT id FROM students WHERE student_id = ? AND id != ?');
            $checkId->execute([$studentId, $user['id']]);
            if ($checkId->fetch()) {
                jsonResponse(false, 'This Student ID is already assigned to another student.', null, 409);
            }
        }

        $updateStmt = $pdo->prepare('
            UPDATE students SET 
                full_name = ?, 
                phone = ?, 
                student_id = ? 
            WHERE id = ?
        ');
        $updateStmt->execute([
            $fullName, 
            $phone, 
            !empty($studentId) ? $studentId : $user['student_id'], 
            $user['id']
        ]);

        $_SESSION['full_name'] = $fullName;
        if (!empty($studentId)) {
            $_SESSION['student_id'] = $studentId;
        }

        jsonResponse(true, 'Profile updated successfully!', [
            'user' => [
                'id'         => $user['id'],
                'full_name'  => $fullName,
                'student_id' => !empty($studentId) ? $studentId : $user['student_id'],
                'email'      => $user['email'],
                'phone'      => $phone,
                'role'       => $user['role']
            ]
        ]);
    } else {
        // Admin update
        $updateStmt = $pdo->prepare('
            UPDATE admins SET 
                full_name = ?
            WHERE id = ?
        ');
        $updateStmt->execute([$fullName, $user['id']]);

        $_SESSION['full_name'] = $fullName;

        jsonResponse(true, 'Profile updated successfully!', [
            'user' => [
                'id'         => $user['id'],
                'full_name'  => $fullName,
                'email'      => $user['email'],
                'role'       => $user['role']
            ]
        ]);
    }

} catch (PDOException $e) {
    jsonResponse(false, 'Database error updating profile: ' . $e->getMessage(), null, 500);
}
