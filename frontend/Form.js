<<<<<<< HEAD
console.log("Form.js loaded");

// ================================
// Toggle Login / Register Forms
// ================================
function toggleForm() {
=======
const SERVER_BASE = (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1"))
    ? "http://localhost:5500"
    : window.location.origin;

const API_BASE = `${SERVER_BASE}/api`;

let selectedRole = "student"; // 'student' or 'admin'
let isRegisterMode = false;

document.addEventListener("DOMContentLoaded", () => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (token && user) {
        if (user.role === "admin") {
            window.location.href = "admin_dashboard.html";
        } else {
            window.location.href = "student_dashboard.html";
        }
    }
});

function setRole(role) {
    selectedRole = role;
    document.getElementById("btnRoleStudent").classList.toggle("active", role === "student");
    document.getElementById("btnRoleAdmin").classList.toggle("active", role === "admin");

    const grpRegisterNo = document.getElementById("grpRegisterNo");
    const grpStudentDetails = document.getElementById("grpStudentDetails");

    if (role === "admin") {
        if (grpRegisterNo) grpRegisterNo.classList.add("hidden");
        if (grpStudentDetails) grpStudentDetails.classList.add("hidden");
        document.getElementById("formTitle").innerText = isRegisterMode ? "Admin Registration" : "Placement Admin Login";
        document.getElementById("lblLoginEmail").innerText = "Admin Email";
    } else {
        if (grpRegisterNo) grpRegisterNo.classList.remove("hidden");
        if (grpStudentDetails) grpStudentDetails.classList.remove("hidden");
        document.getElementById("formTitle").innerText = isRegisterMode ? "Student Registration" : "Student Login";
        document.getElementById("lblLoginEmail").innerText = "Email Address or Register No.";
    }
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    loginForm.classList.toggle("hidden", isRegisterMode);
    registerForm.classList.toggle("hidden", !isRegisterMode);

    setRole(selectedRole);
    hideAlert();
}

<<<<<<< HEAD
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
=======
function showAlert(message, isSuccess = false) {
    const alertBox = document.getElementById("authAlert");
    alertBox.innerText = message;
    alertBox.style.backgroundColor = isSuccess ? "#dcfce7" : "#fee2e2";
    alertBox.style.color = isSuccess ? "#15803d" : "#b91c1c";
    alertBox.style.border = isSuccess ? "1px solid #bbf7d0" : "1px solid #fca5a5";
    alertBox.classList.remove("hidden");
}

function hideAlert() {
    document.getElementById("authAlert").classList.add("hidden");
}

async function handleLogin(e) {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showAlert(data.message || "Invalid credentials. Please try again.");
            return;
        }

        // Store Token & User in localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        showAlert("Login successful! Redirecting...", true);

        setTimeout(() => {
            if (data.user.role === "admin") {
                window.location.href = "admin_dashboard.html";
            } else {
                window.location.href = "student_dashboard.html";
            }
        }, 800);

    } catch (err) {
        console.error(err);
        showAlert("Server connection failed. Make sure backend is running.");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    hideAlert();

    const full_name = document.getElementById("regFullName").value.trim();
    const register_number = document.getElementById("regRegisterNo").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const year = document.getElementById("regYear") ? document.getElementById("regYear").value : "3";
    const phone = document.getElementById("regPhone") ? document.getElementById("regPhone").value.trim() : "";

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name,
                register_number: selectedRole === "student" ? register_number : null,
                email,
                password,
                role: selectedRole,
                year: selectedRole === "student" ? parseInt(year) : null,
                phone
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showAlert(data.message || "Registration failed. Please check details.");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        showAlert("Registered successfully! Redirecting to Dashboard...", true);

        setTimeout(() => {
            if (data.user.role === "admin") {
                window.location.href = "admin_dashboard.html";
            } else {
                window.location.href = "student_dashboard.html";
            }
        }, 1000);

    } catch (err) {
        console.error(err);
        showAlert("Server connection error. Please try again.");
    }
>>>>>>> b6367ee5a7b6d8eb22c3b3c345ff00270a1433c0
}