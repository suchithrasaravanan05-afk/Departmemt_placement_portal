console.log("Form.js loaded");

// ================================
// Toggle Login / Register Forms
// ================================
function toggleForm() {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const navBtn = document.getElementById("navToggleBtn");

    loginForm.classList.toggle("hidden");
    registerForm.classList.toggle("hidden");

    navBtn.innerText = loginForm.classList.contains("hidden")
        ? "Login"
        : "Register";
}

// ================================
// Show / hide password fields
// ================================
function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";

    if (iconId) {
        // register form uses a fa-eye icon
        const icon = document.getElementById(iconId);
        if (icon) {
            icon.classList.toggle("fa-eye");
            icon.classList.toggle("fa-eye-slash");
        }
    } else {
        // login form uses a "Show"/"Hide" text span next to the input
        const group = input.closest(".input-group");
        const toggleSpan = group ? group.querySelector(".toggle-text") : null;
        if (toggleSpan) toggleSpan.textContent = isPassword ? "Hide" : "Show";
    }
}

// ================================
// Small helper to show/hide a warning span
// ================================
function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? "block" : "none";
}

// ================================
// Register Student
// ================================
function validateRegister() {
    console.log("Register clicked");

    const full_name = document.getElementById("regName").value.trim();
    const register_number = document.getElementById("regregisternumber").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPass").value;
    const year = document.getElementById("regYear").value;
    const department = document.getElementById("regDepartment").value;
    const phone = document.getElementById("regPhone").value.trim();

    let valid = true;

    const namePattern = /^[A-Za-z. ]+$/;
    if (!full_name || !namePattern.test(full_name)) {
        showError("error-regName", true);
        valid = false;
    } else {
        showError("error-regName", false);
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
        showError("error-regEmail", true);
        valid = false;
    } else {
        showError("error-regEmail", false);
    }

    if (!password || password.length < 6) {
        showError("error-regPass", true);
        valid = false;
    } else {
        showError("error-regPass", false);
    }

    if (!/^\d{10}$/.test(phone)) {
        showError("error-regPhone", true);
        valid = false;
    } else {
        showError("error-regPhone", false);
    }

    if (!register_number || !year || !department) {
        alert("Please fill all fields, including Register Number, Year, and Department.");
        valid = false;
    }

    if (!valid) return;

    fetch("/api/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            full_name,
            register_number,
            email,
            password,
            year,
            department,
            phone
        })
    })
    .then(async response => {
        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert(data.message || "Registered successfully");

        // Clear form
        document.getElementById("regName").value = "";
        document.getElementById("regregisternumber").value = "";
        document.getElementById("regEmail").value = "";
        document.getElementById("regPass").value = "";
        document.getElementById("regYear").value = "";
        document.getElementById("regDepartment").value = "";
        document.getElementById("regPhone").value = "";

        toggleForm();
    })
    .catch(error => {
        console.error(error);
        alert("Server not reachable");
    });
}

// ================================
// Login (accepts either register number or email,
// matching the backend's OR lookup)
// ================================
function validateLogin() {
    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value.trim();

    let valid = true;

    if (!username) {
        showError("error-loginUser", true);
        valid = false;
    } else {
        showError("error-loginUser", false);
    }

    if (!password) {
        showError("error-loginPass", true);
        valid = false;
    } else {
        showError("error-loginPass", false);
    }

    if (!valid) return;

    fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: username,
            password: password
        })
    })
    .then(async response => {
        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert(data.message || "Login successful");

        if (data.role === "admin") {
            // Admin has no "user" row - store a role marker plus the
            // session token that protects the admin-only API routes.
            localStorage.setItem("user", JSON.stringify({ role: "admin" }));
            localStorage.setItem("adminToken", data.adminToken);
            window.location.href = "admin_dashboard.html";
        } else {
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "student_dashboard.html";
        }
    })
    .catch(error => {
        console.error(error);
        alert("Server not reachable");
    });
}