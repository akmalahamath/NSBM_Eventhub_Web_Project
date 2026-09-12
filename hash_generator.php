<?php
/**
 * NSBM Event Hub - Admin Password Hash Generator
 * Usage: Open this file in your browser to generate a valid BCRYPT hash to paste into phpMyAdmin.
 */

$passwordToHash = '';
$generatedHash = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['password'])) {
    $passwordToHash = $_POST['password'];
    $generatedHash = password_hash($passwordToHash, PASSWORD_BCRYPT);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Generate Admin Password Hash</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; background: #111827; color: #f9fafb; }
        .box { background: #1f2937; padding: 2rem; border-radius: 8px; border: 1px solid #374151; }
        input[type="text"] { width: 100%; padding: 0.75rem; margin: 0.5rem 0 1rem; border-radius: 4px; border: 1px solid #4b5563; background: #374151; color: white; }
        button { background: #10b981; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .result { margin-top: 1.5rem; padding: 1rem; background: #064e3b; border: 1px solid #047857; border-radius: 4px; word-break: break-all; }
        code { font-family: monospace; color: #a7f3d0; font-size: 1.1em; }
    </style>
</head>
<body>
    <div class="box">
        <h2>🔑 Admin Password Hash Generator</h2>
        <p>Because the login system uses highly secure <strong>BCRYPT</strong> hashing, you cannot just type plain text passwords (like "Admin123") directly into the database.</p>
        <p>Type your desired password below to generate the encrypted hash, then copy and paste the hash into the `password` column in phpMyAdmin.</p>
        
        <form method="POST">
            <label><strong>Password to hash:</strong></label>
            <input type="text" name="password" required value="<?php echo htmlspecialchars($passwordToHash); ?>" placeholder="Enter password here...">
            <button type="submit">Generate Hash</button>
        </form>

        <?php if ($generatedHash): ?>
            <div class="result">
                <strong>Your BCRYPT Hash:</strong><br><br>
                <code><?php echo htmlspecialchars($generatedHash); ?></code>
                <p style="margin-bottom:0; margin-top: 1rem; font-size: 0.9em; color: #d1fae5;">Copy the entire string above (starting with $2y$10$) and paste it into the password field in phpMyAdmin.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
