<?php
/**
 * NSBM Event Hub - Dashboard Analytics Endpoint (Admin Only)
 * Computes live metrics from MySQL for statistics cards and visual charts
 */

require_once __DIR__ . '/../config/database.php';

$admin = requireAuth('admin');
$pdo = getDBConnection();

try {
    // 1. Core Summary Metrics
    $totalEvents = (int)$pdo->query('SELECT COUNT(*) FROM events')->fetchColumn();
    $upcomingEvents = (int)$pdo->query('SELECT COUNT(*) FROM events WHERE event_date >= CURDATE() AND status = "upcoming"')->fetchColumn();
    $totalStudents = (int)$pdo->query('SELECT COUNT(*) FROM students')->fetchColumn();
    $totalRegistrations = (int)$pdo->query('SELECT COUNT(*) FROM registrations WHERE status = "confirmed"')->fetchColumn();
    $totalCategories = (int)$pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn();

    // 2. Recent Registrations (Latest 8)
    $recentRegStmt = $pdo->query('
        SELECT 
            r.id,
            r.registration_date,
            r.status,
            r.ticket_code,
            s.full_name AS student_name,
            s.student_id,
            s.email AS student_email,
            e.id AS event_id,
            e.title AS event_title,
            e.event_date
        FROM registrations r
        JOIN students s ON r.user_id = s.id
        JOIN events e ON r.event_id = e.id
        ORDER BY r.registration_date DESC
        LIMIT 8
    ');
    $recentRegistrations = $recentRegStmt->fetchAll();

    // 3. Most Popular Events (Top 5)
    $popularStmt = $pdo->query('
        SELECT 
            e.id,
            e.title,
            e.event_date,
            e.max_participants,
            e.status,
            c.name AS category_name,
            COUNT(CASE WHEN r.status = "confirmed" THEN 1 END) AS registration_count
        FROM events e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN registrations r ON e.id = r.event_id
        GROUP BY e.id
        ORDER BY registration_count DESC, e.event_date ASC
        LIMIT 5
    ');
    $popularEvents = $popularStmt->fetchAll();

    // 4. Category Breakdown (for Doughnut / Bar Chart)
    $catBreakdownStmt = $pdo->query('
        SELECT 
            c.name AS category_name,
            COUNT(DISTINCT e.id) AS event_count,
            COUNT(CASE WHEN r.status = "confirmed" THEN 1 END) AS registration_count
        FROM categories c
        LEFT JOIN events e ON c.id = e.category_id
        LEFT JOIN registrations r ON e.id = r.event_id
        GROUP BY c.id
        ORDER BY event_count DESC
    ');
    $categoryBreakdown = $catBreakdownStmt->fetchAll();

    // 5. Monthly Registrations Trend (Last 6 months)
    $monthlyStmt = $pdo->query("
        SELECT 
            DATE_FORMAT(registration_date, '%b %Y') AS month_label,
            DATE_FORMAT(registration_date, '%Y-%m') AS month_key,
            COUNT(*) AS total_count
        FROM registrations
        WHERE registration_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY month_key
        ORDER BY month_key ASC
    ");
    $monthlyTrends = $monthlyStmt->fetchAll();

    // If less than 2 months of data, generate dummy structure for clean charts
    if (empty($monthlyTrends)) {
        $monthlyTrends = [
            ['month_label' => date('M Y'), 'total_count' => $totalRegistrations]
        ];
    }

    jsonResponse(true, 'Dashboard analytics retrieved successfully.', [
        'stats' => [
            'total_events'        => $totalEvents,
            'upcoming_events'     => $upcomingEvents,
            'total_students'      => $totalStudents,
            'total_registrations' => $totalRegistrations,
            'total_categories'    => $totalCategories
        ],
        'recent_registrations' => $recentRegistrations,
        'popular_events'       => $popularEvents,
        'category_breakdown'   => $categoryBreakdown,
        'monthly_trends'       => $monthlyTrends
    ]);

} catch (PDOException $e) {
    jsonResponse(false, 'Database error generating dashboard analytics: ' . $e->getMessage(), null, 500);
}
