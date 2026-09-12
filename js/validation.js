/**
 * NSBM Event Hub - Form Validation Engine
 */

const Validator = {
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidStudentId(id) {
        // Allows NSBM-2024-XXXX, S12345, or general university ID strings (min 4 chars)
        return id && id.trim().length >= 4;
    },

    isValidPhone(phone) {
        if (!phone) return true; // Optional
        return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone.trim());
    },

    isStrongPassword(pass) {
        return pass && pass.length >= 6;
    },

    attachRealtimeValidation(formEl) {
        if (!formEl) return;

        formEl.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    this.validateField(input);
                }
            });
        });
    },

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMsg = '';

        if (field.required && !value) {
            isValid = false;
            errorMsg = 'This field is required.';
        } else if (field.type === 'email' && value && !this.isValidEmail(value)) {
            isValid = false;
            errorMsg = 'Please enter a valid email address.';
        } else if (field.name === 'student_id' && value && !this.isValidStudentId(value)) {
            isValid = false;
            errorMsg = 'Please enter a valid Student ID (e.g. NSBM-2024-0891).';
        } else if (field.type === 'password' && field.name === 'password' && value && !this.isStrongPassword(value)) {
            isValid = false;
            errorMsg = 'Password must be at least 6 characters.';
        }

        const feedbackEl = field.parentElement.querySelector('.form-feedback');

        if (!isValid) {
            field.classList.add('is-invalid');
            field.classList.remove('is-valid');
            if (feedbackEl) {
                feedbackEl.textContent = errorMsg;
                feedbackEl.className = 'form-feedback is-invalid';
            }
        } else if (value) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            if (feedbackEl) {
                feedbackEl.textContent = '';
                feedbackEl.className = 'form-feedback';
            }
        }

        return isValid;
    }
};
