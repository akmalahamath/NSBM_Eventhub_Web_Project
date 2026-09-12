<?php
/**
 * NSBM Event Hub - Database Configuration & Core Backend Utilities
 * University Final-Year Project
 */

// Enable error reporting during development
error_reporting(E_ALL);
ini_set('display_errors', '0'); // Return JSON errors rather than HTML stack traces

// Start secure session if not started
function initSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Set session cookie to root path so it's sent from all subdirectories
        ini_set('session.cookie_httponly', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.cookie_path', '/');   // ← critical for XAMPP subdirs
        session_name('NSBM_SESSION');           // ← consistent name across all pages
        session_start();
    }
}

// Database Credentials
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'nsbm_event_hub');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_PORT', 3306);
define('DB_CHARSET', 'utf8mb4');

/**
 * Get PDO Database Connection
 * Auto-creates database and schema if running on a fresh MySQL instance
 */
function getDBConnection() {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";port=" . DB_PORT . ";charset=" . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // If database doesn't exist, attempt auto-creation
        if ($e->getCode() == 1049 || strpos($e->getMessage(), 'Unknown database') !== false) {
            try {
                $rootDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=" . DB_CHARSET;
                $rootPdo = new PDO($rootDsn, DB_USER, DB_PASS, $options);
                $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                
                // Now connect to newly created database and run schema
                $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                initializeDatabaseSchema($pdo);
                return $pdo;
            } catch (PDOException $initEx) {
                jsonResponse(false, 'Database connection & auto-setup error: ' . $initEx->getMessage(), null, 500);
            }
        }
        
        jsonResponse(false, 'Database connection failed: ' . $e->getMessage() . '. Please verify MySQL is running.', null, 500);
    }
}

/**
 * Initialize Database Schema from SQL definition if tables are missing
 */
function initializeDatabaseSchema($pdo) {
    $sqlFile = __DIR__ . '/../../database/nsbm_event_hub.sql';
    if (file_exists($sqlFile)) {
        $sql = file_get_contents($sqlFile);
        $pdo->exec($sql);
    }
}

/**
 * Standard JSON API Response Helper
 */
function jsonResponse($success, $message = '', $data = null, $statusCode = 200) {
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    }
    
    echo json_encode([
        'success'   => (bool)$success,
        'message'   => $message,
        'data'      => $data,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Parse JSON Request Body or POST data
 */
function getRequestData() {
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        return is_array($data) ? $data : [];
    }
    
    return $_POST;
}

/**
 * Require Authentication Middleware
 */
function requireAuth($requiredRole = null) {
    initSession();
    
    if (empty($_SESSION['user_id'])) {
        jsonResponse(false, 'Unauthorized. Please login to continue.', null, 401);
    }
    
    if ($requiredRole !== null && ($_SESSION['role'] ?? '') !== $requiredRole) {
        jsonResponse(false, 'Access forbidden. Insufficient permissions.', null, 403);
    }
    
    return [
        'id'         => (int)$_SESSION['user_id'],
        'role'       => $_SESSION['role'],
        'email'      => $_SESSION['email'] ?? '',
        'full_name'  => $_SESSION['full_name'] ?? '',
        'student_id' => $_SESSION['student_id'] ?? null
    ];
}

/**
 * Get Current Authenticated User (Null if guest)
 */
function getCurrentUser() {
    initSession();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    return [
        'id'         => (int)$_SESSION['user_id'],
        'role'       => $_SESSION['role'] ?? 'student',
        'email'      => $_SESSION['email'] ?? '',
        'full_name'  => $_SESSION['full_name'] ?? '',
        'student_id' => $_SESSION['student_id'] ?? null
    ];
}

/**
 * Sanitize String Input
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim((string)$input), ENT_QUOTES, 'UTF-8');
}
