/**
 * NSBM Event Hub - Client Authentication & Guard Logic
 */

// Password Visibility Toggle
function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    const icon = btnEl.querySelector('i');
    
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        }
    }
}

// ==========================================================================
// LOGIN HANDLER
// ==========================================================================
async function handleLoginFormSubmit(e, loginType = 'student') {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (!email || !password) {
        showToast('error', 'Validation Error', 'Please enter both email and password.');
        return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing In...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}auth/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, login_type: loginType })
        });

        const result = await response.json();

        if (result.success) {
            showToast('success', 'Success', result.message || 'Login successful!');
            
            // Student login opens index.html first; admin login opens admin/dashboard.html
            const isInsideSubdir = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/');
            const rootPrefix = isInsideSubdir ? '../' : '';
            const redirectUrl = result.data.user.role === 'admin' ? `${rootPrefix}admin/dashboard.html` : `${rootPrefix}index.html`;
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 800);
        } else {
            showToast('error', 'Login Failed', result.message || 'Invalid credentials.');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast('error', 'Network Error', 'Unable to connect to server. Ensure Apache/PHP is active.');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// ==========================================================================
// REGISTRATION HANDLER
// ==========================================================================
async function handleRegisterFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const fullName = form.full_name.value.trim();
    const studentId = form.student_id.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const password = form.password.value.trim();
    const confirmPassword = form.confirm_password.value.trim();

    // Client Validation
    if (!fullName || !studentId || !email || !password) {
        showToast('error', 'Validation Error', 'Please fill in all required fields.');
        return;
    }

    if (password.length < 6) {
        showToast('error', 'Password Too Short', 'Password must be at least 6 characters.');
        return;
    }

    if (password !== confirmPassword) {
        showToast('error', 'Password Mismatch', 'Passwords do not match.');
        return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating Account...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}auth/register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: fullName,
                student_id: studentId,
                email: email,
                phone: phone,
                password: password,
                confirm_password: confirmPassword
            })
        });

        const result = await response.json();

        if (result.success) {
            showToast('success', 'Registration Complete', result.message);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showToast('error', 'Registration Failed', result.message || 'Registration error occurred.');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    } catch (err) {
        console.error('Registration error:', err);
        showToast('error', 'Network Error', 'Could not reach server.');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// ==========================================================================
// ROLE & SESSION GUARD
// ==========================================================================
async function enforceAuthGuard(requiredRole = null) {
    try {
        const response = await fetch(`${API_BASE}auth/check_session.php`);
        const result = await response.json();

        const isInsideSubdir = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/');
        const loginRedirect = isInsideSubdir ? '../login.html' : 'login.html';

        if (!result.success || !result.data.authenticated) {
            window.location.href = loginRedirect;
            return null;
        }

        const user = result.data.user;

        if (requiredRole && user.role !== requiredRole) {
            showToast('warning', 'Access Denied', 'You do not have permission to view this section.');
            setTimeout(() => {
                window.location.href = user.role === 'admin' ? '../admin/dashboard.html' : '../student/dashboard.html';
            }, 1000);
            return null;
        }

        // Populate user info in sidebar/headers if elements exist
        populateUserUI(user);
        return user;

    } catch (err) {
        console.error('Auth guard error:', err);
        return null;
    }
}

function populateUserUI(user) {
    document.querySelectorAll('.user-name-display').forEach(el => {
        el.textContent = user.full_name;
    });
    document.querySelectorAll('.user-email-display').forEach(el => {
        el.textContent = user.email;
    });
    document.querySelectorAll('.user-studentid-display').forEach(el => {
        el.textContent = user.student_id || 'Staff / Admin';
    });
    document.querySelectorAll('.user-role-display').forEach(el => {
        el.textContent = user.role.toUpperCase();
    });
}
