console.log("Form.js loaded");
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

function validateRegister() {
    console.log("Register clicked");
    fetch("http://localhost:5500/api/auth/register", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        full_name: document.getElementById("regName").value.trim(),
        register_number: document.getElementById("regregisternumber").value.trim(),
        email: document.getElementById("regEmail").value.trim(),
        password: document.getElementById("regPass").value,
        year: document.getElementById("regYear").value,
        department: document.getElementById("regDepartment").value,
        phone: document.getElementById("regPhone").value.trim()
    })
})
    .then(res => res.json())
    .then(data => {
    alert(data.message || "Registered successfully");
    toggleForm();
})
    .catch(err => {
        console.error(err);
        alert("Server not reachable");
    });
}
function validateLogin() {
    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value.trim();

    fetch("http://localhost:5500/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: username,
            password: password
        })
    })
    .then(async res => {
        const data = await res.json();

        if (!res.ok) {
            alert(data.message);   // shows "User not found"
            return;
        }

        alert("Login successful");
        window.location.href = "student_dashboard.html";
    })
    .catch(err => {
        console.error(err);
        alert("Server error");
    });
}