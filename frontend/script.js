// ===============================
// ALUMNICCONNECT - REGISTRATION
// ===============================

const registerForm = document.getElementById("registerForm");

function clearFormOnNavigation(form, buttonLabel) {
    if (!form) {
        return;
    }

    function clearForm() {
        form.reset();

        const message = form.querySelector('[role="status"]');
        if (message) {
            message.textContent = "";
        }

        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = false;
            button.textContent = buttonLabel;
        }

        const countryCode = form.querySelector("#countryCode");
        if (countryCode) {
            countryCode.value = "+91";
        }
    }

    window.addEventListener("pagehide", clearForm);
    window.addEventListener("pageshow", event => {
        if (event.persisted) {
            clearForm();
        }
    });
}

if (registerForm) {
    clearFormOnNavigation(registerForm, "Register");

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const message = document.getElementById("message");
        const button = registerForm.querySelector('button[type="submit"]');

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const countryCode = document.getElementById("countryCode").value;
        const phone = document.getElementById("phone").value.trim();
        const department = document.getElementById("department").value;
        const year = Number(document.getElementById("year").value);
        const interests = document.getElementById("interests").value.trim();
        const password = document.getElementById("password").value;

        message.style.color = "red";
        message.textContent = "";

        // Validate name
        if (!/^[A-Za-z ]{2,100}$/.test(name)) {
            message.textContent = "Enter a valid name using English letters and spaces.";
            return;
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            message.textContent = "Enter a valid email address.";
            return;
        }

        // Validate exactly 10 phone digits
        if (!/^[0-9]{10}$/.test(phone)) {
            message.textContent = "Phone number must contain exactly 10 digits.";
            return;
        }

        // Validate department
        if (!department) {
            message.textContent = "Please select your department.";
            return;
        }

        // Validate year
        if (!Number.isInteger(year) || year < 1 || year > 4) {
            message.textContent = "Please select your current year.";
            return;
        }

        // Validate password
        if (password.length !== 8) {
            message.textContent = "Password must contain exactly 8 characters.";
            return;
        }

        // Combine country code and phone number
        const fullPhone = countryCode + phone;

        const formData = {
            name: name,
            email: email,
            phone: fullPhone,
            department: department,
            year: year,
            interests: interests,
            password: password
        };

        button.disabled = true;
        button.textContent = "Registering...";

        try {
            const response = await fetch(
                "http://localhost:5000/api/students/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(formData)
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Registration failed.");
            }

            message.style.color = "green";
            message.textContent =
                "Registration successful! You can now log in.";

            registerForm.reset();

            document.getElementById("countryCode").value = "+91";

        } catch (error) {
            message.style.color = "red";

            if (error instanceof TypeError) {
                message.textContent =
                    "Cannot connect to the server. Please start the backend.";
            } else {
                message.textContent = error.message;
            }
        } finally {
            button.disabled = false;
            button.textContent = "Register";
        }
    });
}


// ===============================
// ALUMNICCONNECT - LOGIN
// ===============================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    clearFormOnNavigation(loginForm, "Login");

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const message = document.getElementById("message");
        const button = loginForm.querySelector('button[type="submit"]');

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        message.style.color = "red";
        message.textContent = "";

        if (!email || !password) {
            message.textContent = "Please enter your email and password.";
            return;
        }

        if (password.length !== 8) {
            message.textContent = "Password must contain exactly 8 characters.";
            return;
        }

        button.disabled = true;
        button.textContent = "Logging in...";

        try {
            const response = await fetch(
                "http://localhost:5000/api/students/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Login failed.");
            }

            sessionStorage.setItem(
                "alumniConnectStudent",
                JSON.stringify({
                    studentId: result.studentId,
                    name: result.name,
                    email: result.email,
                    token: result.token
                })
            );

            message.style.color = "green";
            message.textContent = "Login successful! Opening dashboard...";

            setTimeout(function () {
                window.location.href = "dashboard.html";
            }, 1000);

        } catch (error) {
            message.style.color = "red";

            if (error instanceof TypeError) {
                message.textContent =
                    "Cannot connect to the server. Please start the backend.";
            } else {
                message.textContent = error.message;
            }
        } finally {
            button.disabled = false;
            button.textContent = "Login";
        }
    });
}

// ===============================
// ALUMNICCONNECT - ADMIN LOGIN
// ===============================

const adminLoginForm = document.getElementById("adminLoginForm");

if (adminLoginForm) {
    clearFormOnNavigation(adminLoginForm, "Sign in");

    const institutionNameInput = document.getElementById("institutionName");
    const adminPasswordInput = document.getElementById("adminPassword");
    const passwordToggle = document.getElementById("adminPasswordToggle");
    const adminLoginMessage = document.getElementById("adminLoginMessage");
    const submitButton = adminLoginForm.querySelector('button[type="submit"]');

    function setAdminLoginMessage(text, type) {
        adminLoginMessage.textContent = text;
        adminLoginMessage.className = `alumni-login-message is-${type}`;
    }

    let isAdminPasswordVisible = false;

    function resetAdminPasswordVisibility() {
        isAdminPasswordVisible = false;
        adminPasswordInput.type = "password";
        passwordToggle.textContent = "Show";
        passwordToggle.setAttribute("aria-pressed", "false");
    }

    resetAdminPasswordVisibility();
    passwordToggle.onclick = function () {
        isAdminPasswordVisible = !isAdminPasswordVisible;
        adminPasswordInput.type = isAdminPasswordVisible ? "text" : "password";
        passwordToggle.textContent = isAdminPasswordVisible ? "Hide" : "Show";
        passwordToggle.setAttribute("aria-pressed", String(isAdminPasswordVisible));
    };

    window.addEventListener("pagehide", resetAdminPasswordVisibility);
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            resetAdminPasswordVisibility();
            adminLoginMessage.className = "alumni-login-message";
        }
    });

    adminLoginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        adminLoginMessage.className = "alumni-login-message";
        adminLoginMessage.textContent = "";

        const institutionName = institutionNameInput.value.trim();
        const password = adminPasswordInput.value;

        if (!institutionName) {
            setAdminLoginMessage("Enter your institution name.", "error");
            institutionNameInput.focus();
            return;
        }

        if (!password || password.length > 255) {
            setAdminLoginMessage("Enter a valid password.", "error");
            adminPasswordInput.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Signing in...";

        try {
            const response = await fetch("http://localhost:5000/api/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ institutionName, password })
            });

            let result;
            try {
                result = await response.json();
            } catch (error) {
                console.error("Admin login response parsing error:", error);
                setAdminLoginMessage(
                    response.ok
                        ? "The backend returned an invalid response."
                        : `The server returned HTTP ${response.status} with an unreadable response.`,
                    "error"
                );
                return;
            }

            if (!response.ok || !result || result.success !== true) {
                setAdminLoginMessage(
                    typeof result?.message === "string"
                        ? result.message
                        : `Login failed with HTTP ${response.status}.`,
                    "error"
                );
                return;
            }

            if (!result.token || !result.adminId) {
                setAdminLoginMessage(
                    "The backend response is missing administrator session details.",
                    "error"
                );
                return;
            }

            try {
                sessionStorage.setItem("alumniConnectAdmin", JSON.stringify({
                    adminId: result.adminId,
                    institutionName: result.institutionName,
                    token: result.token
                }));
            } catch (error) {
                console.error("Admin session storage error:", error);
                setAdminLoginMessage(
                    "Login succeeded, but this browser could not save the session.",
                    "error"
                );
                return;
            }

            adminPasswordInput.value = "";
            setAdminLoginMessage("Admin sign in successful.", "success");
        } catch (error) {
            console.error("Admin login request error:", error);
            setAdminLoginMessage(
                error instanceof TypeError
                    ? "Could not connect to the backend. Please check that the server is running."
                    : "Unable to complete admin login. Please try again.",
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Sign in";
        }
    });
}

// ===============================
// ALUMNICCONNECT - ALUMNI LOGIN
// ===============================

const alumniLoginForm = document.getElementById("alumniLoginForm");

if (alumniLoginForm) {
    clearFormOnNavigation(alumniLoginForm, "Sign in");

    const alumniEmailInput = document.getElementById("alumniEmail");
    const alumniPasswordInput = document.getElementById("alumniPassword");
    const passwordToggle = document.getElementById("alumniPasswordToggle");
    const alumniLoginMessage = document.getElementById("alumniLoginMessage");
    const submitButton = alumniLoginForm.querySelector('button[type="submit"]');

    function setAlumniLoginMessage(text, type) {
        alumniLoginMessage.textContent = text;
        alumniLoginMessage.className = `alumni-login-message is-${type}`;
    }

    let isAlumniPasswordVisible = false;

    function resetPasswordVisibility() {
        isAlumniPasswordVisible = false;
        alumniPasswordInput.type = "password";
        passwordToggle.textContent = "Show";
        passwordToggle.setAttribute("aria-pressed", "false");
    }

    resetPasswordVisibility();
    passwordToggle.onclick = function () {
        isAlumniPasswordVisible = !isAlumniPasswordVisible;
        alumniPasswordInput.type = isAlumniPasswordVisible ? "text" : "password";
        passwordToggle.textContent = isAlumniPasswordVisible ? "Hide" : "Show";
        passwordToggle.setAttribute(
            "aria-pressed",
            String(isAlumniPasswordVisible)
        );
    };

    window.addEventListener("pagehide", resetPasswordVisibility);
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            resetPasswordVisibility();
            alumniLoginMessage.className = "alumni-login-message";
        }
    });

    alumniLoginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        alumniLoginMessage.className = "alumni-login-message";
        alumniLoginMessage.textContent = "";

        const email = alumniEmailInput.value.trim().toLowerCase();
        const password = alumniPasswordInput.value;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setAlumniLoginMessage("Enter a valid registered email address.", "error");
            alumniEmailInput.focus();
            return;
        }

        if (!password) {
            setAlumniLoginMessage("Enter your password.", "error");
            alumniPasswordInput.focus();
            return;
        }

        if (password.length > 30) {
            setAlumniLoginMessage("Password must be no more than 30 characters.", "error");
            alumniPasswordInput.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Signing in...";
        let redirecting = false;

        try {
            const response = await fetch("http://localhost:5000/api/alumni/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            let result;
            try {
                result = await response.json();
            } catch (error) {
                console.error("Alumni login response parsing error:", error);
                setAlumniLoginMessage(
                    response.ok
                        ? "The backend returned an invalid response."
                        : `The server returned HTTP ${response.status} with an unreadable response.`,
                    "error"
                );
                return;
            }

            if (!response.ok || !result || result.success !== true) {
                setAlumniLoginMessage(
                    typeof result?.message === "string"
                        ? result.message
                        : `Login failed with HTTP ${response.status}.`,
                    "error"
                );
                return;
            }

            if (!result.token || !result.alumniId) {
                setAlumniLoginMessage(
                    "The backend response is missing alumni session details.",
                    "error"
                );
                return;
            }

            try {
                sessionStorage.setItem("alumniConnectAlumni", JSON.stringify({
                    alumniId: result.alumniId,
                    name: result.name,
                    email: result.email,
                    token: result.token
                }));
            } catch (error) {
                console.error("Alumni session storage error:", error);
                setAlumniLoginMessage(
                    "Login succeeded, but this browser could not save the session.",
                    "error"
                );
                return;
            }

            alumniPasswordInput.value = "";
            setAlumniLoginMessage(
                "Login successful. Opening your dashboard...",
                "success"
            );
            redirecting = true;
            window.setTimeout(function () {
                window.location.assign("alumni-dashboard.html");
            }, 800);
        } catch (error) {
            console.error("Alumni login request error:", error);
            setAlumniLoginMessage(
                error instanceof TypeError
                    ? "Could not connect to the backend. Please check that the server is running."
                    : "Unable to complete alumni login. Please try again.",
                "error"
            );
        } finally {
            if (!redirecting) {
                submitButton.disabled = false;
                submitButton.textContent = "Sign in";
            }
        }
    });
}

console.log("AlumniConnect frontend loaded successfully!");