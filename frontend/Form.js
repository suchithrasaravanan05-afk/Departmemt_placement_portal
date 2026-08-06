console.log("Form.js loaded");

// Always use the current origin — works on Vercel, custom domain, etc.
const API_BASE = `${window.location.origin}/api`;

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
    const btnStudent = document.getElementById("btnRoleStudent");
    const btnAdmin = document.getElementById("btnRoleAdmin");
    if (btnStudent) btnStudent.classList.toggle("active", role === "student");
    if (btnAdmin) btnAdmin.classList.toggle("active", role === "admin");

    const grpRegisterNo = document.getElementById("grpRegisterNo");
    const grpStudentDetails = document.getElementById("grpStudentDetails");

    if (role === "admin") {
        if (grpRegisterNo) grpRegisterNo.classList.add("hidden");
        if (grpStudentDetails) grpStudentDetails.classList.add("hidden");
        const title = document.getElementById("formTitle");
        if (title) title.innerText = isRegisterMode ? "Admin Registration" : "Placement Admin Login";
        const lbl = document.getElementById("lblLoginEmail");
        if (lbl) lbl.innerText = "Admin Email";
    } else {
        if (grpRegisterNo) grpRegisterNo.classList.remove("hidden");
        if (grpStudentDetails) grpStudentDetails.classList.remove("hidden");
        const title = document.getElementById("formTitle");
        if (title) title.innerText = isRegisterMode ? "Student Registration" : "Student Login";
        const lbl = document.getElementById("lblLoginEmail");
        if (lbl) lbl.innerText = "Email Address or Register No.";
    }
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) loginForm.classList.toggle("hidden", isRegisterMode);
    if (registerForm) registerForm.classList.toggle("hidden", !isRegisterMode);

    setRole(selectedRole);
    hideAlert();
}

function toggleForm() {
    toggleAuthMode();
}

function showAlert(message, isSuccess = false) {
    const alertBox = document.getElementById("authAlert");
    if (!alertBox) return;
    alertBox.innerText = message;
    alertBox.style.backgroundColor = isSuccess ? "#dcfce7" : "#fee2e2";
    alertBox.style.color = isSuccess ? "#15803d" : "#b91c1c";
    alertBox.style.border = isSuccess ? "1px solid #bbf7d0" : "1px solid #fca5a5";
    alertBox.classList.remove("hidden");
}

function hideAlert() {
    const alertBox = document.getElementById("authAlert");
    if (alertBox) alertBox.classList.add("hidden");
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    hideAlert();

    const emailInput = document.getElementById("loginEmail") || document.getElementById("loginUser");
    const passwordInput = document.getElementById("loginPassword") || document.getElementById("loginPass");

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

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
        if (data.adminToken) localStorage.setItem("adminToken", data.adminToken);

        showAlert("Login successful! Redirecting...", true);

        setTimeout(() => {
            if (data.user && data.user.role === "admin") {
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
    if (e) e.preventDefault();
    hideAlert();

    const full_name = document.getElementById("regFullName") ? document.getElementById("regFullName").value.trim() : "";
    const register_number = document.getElementById("regRegisterNo") ? document.getElementById("regRegisterNo").value.trim() : "";
    const email = document.getElementById("regEmail") ? document.getElementById("regEmail").value.trim() : "";
    const password = document.getElementById("regPassword") ? document.getElementById("regPassword").value : "";
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
            if (data.user && data.user.role === "admin") {
                window.location.href = "admin_dashboard.html";
            } else {
                window.location.href = "student_dashboard.html";
            }
        }, 1000);

    } catch (err) {
        console.error(err);
        showAlert("Server connection error. Please try again.");
    }
}