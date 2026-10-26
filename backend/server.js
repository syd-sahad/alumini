const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();

const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const studentSessions = new Map();
const alumniSessions = new Map();
const adminSessions = new Map();
const STUDENT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use((error, req, res, next) => {
    if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        Object.prototype.hasOwnProperty.call(error, "body")
    ) {
        return res.status(400).json({
            success: false,
            message: "Request body must contain valid JSON."
        });
    }

    return next(error);
});

function requireStudentAuthentication(req, res, next) {
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";
    const session = studentSessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
        if (session) {
            studentSessions.delete(token);
        }

        return res.status(401).json({
            success: false,
            message: "Please log in to continue."
        });
    }

    req.studentId = session.studentId;
    req.sessionToken = token;
    return next();
}

function requireAlumniAuthentication(req, res, next) {
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";
    const session = alumniSessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
        if (session) {
            alumniSessions.delete(token);
        }

        return res.status(401).json({
            success: false,
            message: "Please log in with an alumni account to continue."
        });
    }

    req.alumniId = session.alumniId;
    req.alumniSessionToken = token;
    return next();
}

function requireAdminAuthentication(req, res, next) {
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";
    const session = adminSessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
        if (session) {
            adminSessions.delete(token);
        }

        return res.status(401).json({
            success: false,
            message: "Please log in with an administrator account to continue."
        });
    }

    req.adminId = session.adminId;
    req.adminSessionToken = token;
    return next();
}

function removeExpiredSessions(sessions, now) {
    for (const [token, session] of sessions) {
        if (session.expiresAt <= now) {
            sessions.delete(token);
        }
    }
}

function parsePositiveInteger(value) {
    if (
        typeof value !== "number" &&
        (typeof value !== "string" || !/^\d+$/.test(value))
    ) {
        return null;
    }

    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
}

// Home route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to AlumniConnect API"
    });
});

// Health check
app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS test");

        res.json({
            success: true,
            message: "Backend and MySQL are connected!",
            database: process.env.DB_NAME
        });
    } catch (error) {
        console.error("Health check error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// Student registration
app.post("/api/students/register", async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            department,
            year,
            interests,
            password
        } = req.body;

        if (
            !name ||
            !email ||
            !phone ||
            !department ||
            year === undefined ||
            year === null ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields."
            });
        }

        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPhone = phone.trim();

        // Validate name
        if (!/^[A-Za-z ]{2,100}$/.test(trimmedName)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid name."
            });
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address."
            });
        }

        // Validate international phone format
        // Examples: +919876543210, +14165551234
        if (!/^\+[1-9]\d{3,14}$/.test(trimmedPhone)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid country code and phone number."
            });
        }

        // Validate department
        if (typeof department !== "string" || !department.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please select your department."
            });
        }

        // Validate year
        const studentYear = Number(year);

        if (!Number.isInteger(studentYear) || studentYear < 1 || studentYear > 4) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid year."
            });
        }

        // Validate password
        if (typeof password !== "string" || password.length !== 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain exactly 8 characters."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert student
        const [result] = await db.execute(
            `INSERT INTO Student
            (Name, Email, Phone, Department, Year, Career_Interests, Password_Hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                trimmedName,
                trimmedEmail,
                trimmedPhone,
                department.trim(),
                studentYear,
                interests ? interests.trim() : "",
                passwordHash
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful!",
            studentId: result.insertId
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This email is already registered. Please log in."
            });
        }

        if (error.code === "ER_BAD_FIELD_ERROR") {
            return res.status(500).json({
                success: false,
                message: "A required database column is missing. Check the Student table."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
});
// Get complete student profile
app.get("/api/students/:id", requireStudentAuthentication, async (req, res) => {
    try {
        const studentId = parsePositiveInteger(req.params.id);

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        if (studentId !== req.studentId) {
            return res.status(403).json({
                success: false,
                message: "You can only view your own profile."
            });
        }

        const [students] = await db.execute(
            `SELECT
                Student_ID,
                Name,
                Email,
                Phone,
                Department,
                Year,
                Career_Interests
             FROM Student
             WHERE Student_ID = ?`,
            [studentId]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        const student = students[0];

        return res.json({
            success: true,
            student: {
                studentId: student.Student_ID,
                name: student.Name,
                email: student.Email,
                phone: student.Phone,
                department: student.Department,
                year: student.Year,
                careerInterests: student.Career_Interests
            }
        });

    } catch (error) {
        console.error("Profile error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve student profile."
        });
    }
});

// Student login
app.post("/api/students/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email and password."
            });
        }

        if (typeof password !== "string" || password.length !== 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain exactly 8 characters."
            });
        }

        const trimmedEmail = email.trim().toLowerCase();

        const [students] = await db.execute(
            `SELECT Student_ID, Name, Email, Password_Hash
             FROM Student
             WHERE Email = ?
             LIMIT 1`,
            [trimmedEmail]
        );

        if (students.length === 0 || !students[0].Password_Hash) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const student = students[0];

        const passwordMatches = await bcrypt.compare(
            password,
            student.Password_Hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const now = Date.now();

        for (const [token, session] of studentSessions) {
            if (session.expiresAt <= now) {
                studentSessions.delete(token);
            }
        }

        const sessionToken = crypto.randomBytes(32).toString("hex");
        studentSessions.set(sessionToken, {
            studentId: student.Student_ID,
            expiresAt: now + STUDENT_SESSION_TTL_MS
        });

        return res.json({
            success: true,
            message: "Login successful!",
            studentId: student.Student_ID,
            name: student.Name,
            email: student.Email,
            token: sessionToken
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
});

app.post("/api/students/logout", requireStudentAuthentication, (req, res) => {
    studentSessions.delete(req.sessionToken);
    return res.json({
        success: true,
        message: "You have been logged out."
    });
});

app.post("/api/alumni/login", async (req, res) => {
    try {
        const email = req.body?.email;
        const password = req.body?.password;

        if (
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof password !== "string" ||
            password.length === 0 ||
            password.length > 30
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email and a password of up to 30 characters."
            });
        }

        const [alumniRows] = await db.execute(
            `SELECT Alumni_ID, Name, Email, Password_Hash
             FROM alumni
             WHERE Email = ?
             LIMIT 1`,
            [email.trim().toLowerCase()]
        );

        const alumnus = alumniRows[0];
        if (
            !alumnus ||
            typeof alumnus.Password_Hash !== "string" ||
            !alumnus.Password_Hash
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid alumni email or password. An account password may not have been provisioned."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            alumnus.Password_Hash
        );
        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid alumni email or password."
            });
        }

        const now = Date.now();
        removeExpiredSessions(alumniSessions, now);

        const token = crypto.randomBytes(32).toString("hex");
        alumniSessions.set(token, {
            alumniId: alumnus.Alumni_ID,
            expiresAt: now + STUDENT_SESSION_TTL_MS
        });

        return res.json({
            success: true,
            message: "Alumni login successful.",
            alumniId: alumnus.Alumni_ID,
            name: alumnus.Name,
            email: alumnus.Email,
            token
        });
    } catch (error) {
        console.error("Alumni login error:", error.message);

        if (error.code === "ER_BAD_FIELD_ERROR") {
            return res.status(503).json({
                success: false,
                message: "Alumni login is not configured. Add the Password_Hash column and provision an alumni password."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Alumni login failed. Please try again."
        });
    }
});

app.post("/api/alumni/logout", requireAlumniAuthentication, (req, res) => {
    alumniSessions.delete(req.alumniSessionToken);
    return res.json({
        success: true,
        message: "You have been logged out."
    });
});

app.post("/api/admin/login", async (req, res) => {
    try {
        const institutionName = req.body?.institutionName;
        const password = req.body?.password;

        if (
            typeof institutionName !== "string" ||
            institutionName.trim().length === 0 ||
            institutionName.trim().length > 100 ||
            typeof password !== "string" ||
            password.length === 0 ||
            password.length > 255
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid institution name and password."
            });
        }

        const [adminRows] = await db.execute(
            `SELECT Admin_ID, Name, Password
             FROM admin
             WHERE Name = ?
             LIMIT 1`,
            [institutionName.trim()]
        );

        const admin = adminRows[0];
        if (
            !admin ||
            typeof admin.Password !== "string" ||
            !admin.Password
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid institution name or password."
            });
        }

        const passwordMatches = await bcrypt.compare(password, admin.Password);
        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid institution name or password."
            });
        }

        const now = Date.now();
        removeExpiredSessions(adminSessions, now);

        const token = crypto.randomBytes(32).toString("hex");
        adminSessions.set(token, {
            adminId: admin.Admin_ID,
            expiresAt: now + STUDENT_SESSION_TTL_MS
        });

        return res.json({
            success: true,
            message: "Admin login successful.",
            adminId: admin.Admin_ID,
            institutionName: admin.Name,
            token
        });
    } catch (error) {
        console.error("Admin login error:", error.message);

        if (error.code === "ER_BAD_FIELD_ERROR") {
            return res.status(503).json({
                success: false,
                message: "Admin login is not configured. Check the admin table schema."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Admin login failed. Please try again."
        });
    }
});

app.post("/api/admin/logout", requireAdminAuthentication, (req, res) => {
    adminSessions.delete(req.adminSessionToken);
    return res.json({
        success: true,
        message: "You have been logged out."
    });
});

app.get("/api/alumni/me", requireAlumniAuthentication, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT Alumni_ID, Name, Email, Phone, Department,
                    Graduation_Year, Company, Job_Role, Skills
             FROM alumni
             WHERE Alumni_ID = ?
             LIMIT 1`,
            [req.alumniId]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Alumni profile not found."
            });
        }

        const alumnus = rows[0];
        return res.json({
            success: true,
            alumnus: {
                alumniId: alumnus.Alumni_ID,
                name: alumnus.Name,
                email: alumnus.Email,
                phone: alumnus.Phone,
                department: alumnus.Department,
                graduationYear: alumnus.Graduation_Year,
                company: alumnus.Company,
                jobRole: alumnus.Job_Role,
                skills: alumnus.Skills
            }
        });
    } catch (error) {
        console.error("Alumni profile error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve alumni profile."
        });
    }
});

app.patch("/api/alumni/me", requireAlumniAuthentication, async (req, res) => {
    const editableFields = ["phone", "company", "jobRole", "skills"];
    const body = req.body;

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length !== editableFields.length ||
        !editableFields.every(field =>
            Object.prototype.hasOwnProperty.call(body, field)
        )
    ) {
        return res.status(400).json({
            success: false,
            message: "Provide phone, company, job role, and skills only."
        });
    }

    const limits = {
        phone: 15,
        company: 150,
        jobRole: 150
    };
    const profile = {};

    for (const field of editableFields) {
        const value = body[field];
        if (value !== null && typeof value !== "string") {
            return res.status(400).json({
                success: false,
                message: `${field} must be a string or null.`
            });
        }

        const normalizedValue = typeof value === "string" ? value.trim() : "";
        if (
            (limits[field] && normalizedValue.length > limits[field]) ||
            (field === "skills" &&
                Buffer.byteLength(normalizedValue, "utf8") > 65535)
        ) {
            return res.status(400).json({
                success: false,
                message: `${field} exceeds the maximum length.`
            });
        }

        profile[field] = normalizedValue || null;
    }

    try {
        await db.execute(
            `UPDATE alumni
             SET Phone = ?, Company = ?, Job_Role = ?, Skills = ?
             WHERE Alumni_ID = ?`,
            [
                profile.phone,
                profile.company,
                profile.jobRole,
                profile.skills,
                req.alumniId
            ]
        );

        const [rows] = await db.execute(
            `SELECT Alumni_ID, Name, Email, Phone, Department,
                    Graduation_Year, Company, Job_Role, Skills
             FROM alumni
             WHERE Alumni_ID = ?
             LIMIT 1`,
            [req.alumniId]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Alumni profile not found."
            });
        }

        const alumnus = rows[0];
        return res.json({
            success: true,
            message: "Profile updated successfully.",
            alumnus: {
                alumniId: alumnus.Alumni_ID,
                name: alumnus.Name,
                email: alumnus.Email,
                phone: alumnus.Phone,
                department: alumnus.Department,
                graduationYear: alumnus.Graduation_Year,
                company: alumnus.Company,
                jobRole: alumnus.Job_Role,
                skills: alumnus.Skills
            }
        });
    } catch (error) {
        console.error("Alumni profile update error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update alumni profile."
        });
    }
});

app.get(
    "/api/alumni/mentorship-requests",
    requireAlumniAuthentication,
    async (req, res) => {
        try {
            const [requests] = await db.execute(
                `SELECT
                    mr.Request_ID,
                    mr.Request_Date,
                    mr.Description,
                    mr.Status,
                    s.Student_ID,
                    s.Name AS Student_Name,
                    s.Department AS Student_Department,
                    s.Year AS Student_Year,
                    s.Career_Interests
                 FROM mentorship_request AS mr
                 INNER JOIN student AS s ON s.Student_ID = mr.Student_ID
                 WHERE mr.Alumni_ID = ?
                 ORDER BY mr.Request_Date DESC, mr.Request_ID DESC`,
                [req.alumniId]
            );

            return res.json({
                success: true,
                count: requests.length,
                requests: requests.map(request => ({
                    requestId: request.Request_ID,
                    requestDate: request.Request_Date,
                    description: request.Description,
                    status: request.Status,
                    student: {
                        studentId: request.Student_ID,
                        name: request.Student_Name,
                        department: request.Student_Department,
                        year: request.Student_Year,
                        careerInterests: request.Career_Interests
                    }
                }))
            });
        } catch (error) {
            console.error("Alumni mentorship request retrieval error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to retrieve mentorship requests."
            });
        }
    }
);

app.patch(
    "/api/alumni/mentorship-requests/:id/status",
    requireAlumniAuthentication,
    async (req, res) => {
        const requestId = parsePositiveInteger(req.params.id);
        const status = req.body?.status;

        if (!requestId || !["Accepted", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Provide a valid request ID and status (Accepted or Rejected)."
            });
        }

        try {
            const [result] = await db.execute(
                `UPDATE mentorship_request
                 SET Status = ?
                 WHERE Request_ID = ?
                   AND Alumni_ID = ?
                   AND Status = 'Pending'`,
                [status, requestId, req.alumniId]
            );

            if (result.affectedRows === 0) {
                const [ownedRequests] = await db.execute(
                    `SELECT Request_ID, Status
                     FROM mentorship_request
                     WHERE Request_ID = ? AND Alumni_ID = ?`,
                    [requestId, req.alumniId]
                );

                if (!ownedRequests.length) {
                    return res.status(404).json({
                        success: false,
                        message: "Request not found for this alumnus."
                    });
                }

                return res.status(409).json({
                    success: false,
                    message: `This request is already ${ownedRequests[0].Status}.`
                });
            }

            return res.json({
                success: true,
                message: `Request ${status.toLowerCase()} successfully.`,
                requestId,
                status
            });
        } catch (error) {
            console.error("Mentorship request status update error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Unable to update the request status."
            });
        }
    }
);

app.post(
    "/api/alumni/mentorship-requests/:id/replies",
    requireAlumniAuthentication,
    async (req, res) => {
        const requestId = parsePositiveInteger(req.params.id);
        const message = req.body?.message;

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "Invalid mentorship request ID."
            });
        }

        if (
            typeof message !== "string" ||
            !message.trim() ||
            message.trim().length > 2000
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a reply of 1 to 2000 characters."
            });
        }

        try {
            const [result] = await db.execute(
                `INSERT INTO mentorship_message
                    (Request_ID, Student_ID, Alumni_ID, Message)
                 SELECT Request_ID, Student_ID, Alumni_ID, ?
                 FROM mentorship_request
                 WHERE Request_ID = ? AND Alumni_ID = ?`,
                [message.trim(), requestId, req.alumniId]
            );

            if (!result.affectedRows) {
                return res.status(404).json({
                    success: false,
                    message: "Request not found for this alumnus."
                });
            }

            return res.status(201).json({
                success: true,
                message: "Reply sent to the student.",
                messageId: result.insertId,
                requestId
            });
        } catch (error) {
            console.error("Mentorship reply creation error:", error.message);

            if (error.code === "ER_NO_SUCH_TABLE") {
                return res.status(503).json({
                    success: false,
                    message: "Replies are not configured. Create the Mentorship_Message table first."
                });
            }

            return res.status(500).json({
                success: false,
                message: "Unable to send the reply."
            });
        }
    }
);

app.get(
    "/api/students/:id/mentorship-replies",
    requireStudentAuthentication,
    async (req, res) => {
        const studentId = parsePositiveInteger(req.params.id);

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        if (studentId !== req.studentId) {
            return res.status(403).json({
                success: false,
                message: "You can only view replies to your own requests."
            });
        }

        try {
            const [replies] = await db.execute(
                `SELECT
                    mm.Message_ID,
                    mm.Request_ID,
                    mm.Message,
                    mm.Created_At,
                    a.Name AS Alumni_Name,
                    a.Company
                 FROM mentorship_message AS mm
                 INNER JOIN mentorship_request AS mr
                    ON mr.Request_ID = mm.Request_ID
                   AND mr.Student_ID = mm.Student_ID
                   AND mr.Alumni_ID = mm.Alumni_ID
                 INNER JOIN alumni AS a ON a.Alumni_ID = mm.Alumni_ID
                 WHERE mm.Student_ID = ?
                 ORDER BY mm.Created_At ASC, mm.Message_ID ASC`,
                [req.studentId]
            );

            return res.json({
                success: true,
                count: replies.length,
                replies: replies.map(reply => ({
                    messageId: reply.Message_ID,
                    requestId: reply.Request_ID,
                    message: reply.Message,
                    createdAt: reply.Created_At,
                    alumniName: reply.Alumni_Name,
                    company: reply.Company
                }))
            });
        } catch (error) {
            console.error("Student mentorship reply retrieval error:", error.message);

            if (error.code === "ER_NO_SUCH_TABLE") {
                return res.status(503).json({
                    success: false,
                    message: "Replies are not configured. Create the Mentorship_Message table first."
                });
            }

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve mentorship replies."
            });
        }
    }
);

// Get all alumni and search alumni
app.get("/api/alumni", async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();

        const [alumni] = await db.execute(
            `SELECT
                Alumni_ID,
                Name,
                Email,
                Phone,
                Department,
                Graduation_Year,
                Company,
                Job_Role,
                Skills
             FROM Alumni
             WHERE Name LIKE ?
                OR Department LIKE ?
                OR Company LIKE ?
                OR Job_Role LIKE ?
                OR Skills LIKE ?
             ORDER BY Name ASC
             LIMIT 100`,
            [
                `%${search}%`,
                `%${search}%`,
                `%${search}%`,
                `%${search}%`,
                `%${search}%`
            ]
        );

        return res.json({
            success: true,
            count: alumni.length,
            alumni: alumni.map(person => ({
                alumniId: person.Alumni_ID,
                name: person.Name,
                email: person.Email,
                phone: person.Phone,
                department: person.Department,
                graduationYear: person.Graduation_Year,
                company: person.Company,
                jobRole: person.Job_Role,
                skills: person.Skills
            }))
        });
    } catch (error) {
        console.error("Alumni search error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve alumni. Please check the Alumni table."
        });
    }
});

app.get("/api/events", async (req, res) => {
    try {
        const [events] = await db.execute(
            `SELECT
                \`Event_ID\`,
                \`Event_Name\`,
                \`Description\`,
                \`Event_Location\`,
                \`Date\`,
                \`Time\`
             FROM \`Event\`
             ORDER BY \`Date\` IS NULL ASC, \`Date\` ASC, \`Time\` ASC, \`Event_ID\` ASC`
        );

        return res.json({
            success: true,
            count: events.length,
            events: events.map(event => ({
                eventId: event.Event_ID,
                eventName: event.Event_Name,
                description: event.Description,
                location: event.Event_Location,
                date: event.Date,
                time: event.Time
            }))
        });
    } catch (error) {
        console.error("Event retrieval error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve events. Please check the Event table."
        });
    }
});

app.get("/api/announcements", async (req, res) => {
    try {
        const [announcements] = await db.execute(
            `SELECT
                \`Announcement_ID\`,
                \`Title\`,
                \`Message\`,
                \`Created_At\`
             FROM \`Announcement\`
             ORDER BY \`Created_At\` DESC, \`Announcement_ID\` DESC`
        );

        return res.json({
            success: true,
            announcements: announcements.map(announcement => ({
                announcementId: announcement.Announcement_ID,
                title: announcement.Title,
                message: announcement.Message,
                createdAt: announcement.Created_At
            }))
        });
    } catch (error) {
        console.error("Announcement retrieval error:", error.message);

        if (error.code === "ER_NO_SUCH_TABLE") {
            return res.status(503).json({
                success: false,
                message: "Announcements are not configured yet. Create the Announcement table and try again."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve announcements."
        });
    }
});

app.post(
    "/api/mentorship-requests",
    requireStudentAuthentication,
    async (req, res) => {
        try {
            const alumniId = parsePositiveInteger(req.body?.alumniId);
            const description = req.body?.description;

            if (!alumniId) {
                return res.status(400).json({
                    success: false,
                    message: "Select a valid alumnus."
                });
            }

            if (
                typeof description !== "string" ||
                !description.trim() ||
                description.trim().length > 2000
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a message of 1 to 2000 characters."
                });
            }

            const [students] = await db.execute(
                "SELECT Student_ID FROM Student WHERE Student_ID = ?",
                [req.studentId]
            );

            if (students.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "The logged-in student account no longer exists."
                });
            }

            const [alumni] = await db.execute(
                "SELECT Alumni_ID FROM Alumni WHERE Alumni_ID = ?",
                [alumniId]
            );

            if (alumni.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "The selected alumnus was not found."
                });
            }

            const [result] = await db.execute(
                `INSERT INTO Mentorship_Request
                    (Description, Status, Student_ID, Alumni_ID)
                 VALUES (?, 'Pending', ?, ?)`,
                [description.trim(), req.studentId, alumniId]
            );

            return res.status(201).json({
                success: true,
                message: "Your mentorship request was sent.",
                requestId: result.insertId,
                status: "Pending"
            });
        } catch (error) {
            console.error("Mentorship request creation error:", error.message);

            if (
                error.code === "ER_NO_REFERENCED_ROW_2" ||
                error.code === "ER_NO_REFERENCED_ROW"
            ) {
                return res.status(409).json({
                    success: false,
                    message: "The student or alumnus record no longer exists."
                });
            }

            return res.status(500).json({
                success: false,
                message: "Unable to send the mentorship request."
            });
        }
    }
);

app.get(
    "/api/students/:id/requests",
    requireStudentAuthentication,
    async (req, res) => {
        try {
            const studentId = parsePositiveInteger(req.params.id);

            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid student ID."
                });
            }

            if (studentId !== req.studentId) {
                return res.status(403).json({
                    success: false,
                    message: "You can only view your own mentorship requests."
                });
            }

            const [requests] = await db.execute(
                `SELECT
                    mr.Request_ID,
                    mr.Request_Date,
                    mr.Description,
                    mr.Status AS Request_Status,
                    a.Alumni_ID,
                    a.Name AS Alumni_Name,
                    a.Company
                 FROM mentorship_request AS mr
                 INNER JOIN alumni AS a ON a.Alumni_ID = mr.Alumni_ID
                 WHERE mr.Student_ID = ?
                 ORDER BY mr.Request_Date DESC, mr.Request_ID DESC`,
                [req.studentId]
            );

            let repliesByRequest = new Map();
            if (requests.length) {
                const [replies] = await db.execute(
                    `SELECT
                        mm.Message_ID,
                        mm.Request_ID,
                        mm.Message,
                        mm.Created_At,
                        a.Name AS Alumni_Name,
                        a.Company
                     FROM mentorship_message AS mm
                     INNER JOIN mentorship_request AS mr
                        ON mr.Request_ID = mm.Request_ID
                       AND mr.Student_ID = mm.Student_ID
                       AND mr.Alumni_ID = mm.Alumni_ID
                     INNER JOIN alumni AS a ON a.Alumni_ID = mm.Alumni_ID
                     WHERE mm.Student_ID = ?
                     ORDER BY mm.Created_At ASC, mm.Message_ID ASC`,
                    [req.studentId]
                );

                repliesByRequest = replies.reduce((grouped, reply) => {
                    const requestReplies = grouped.get(reply.Request_ID) || [];
                    requestReplies.push({
                        messageId: reply.Message_ID,
                        message: reply.Message,
                        createdAt: reply.Created_At,
                        alumniName: reply.Alumni_Name,
                        company: reply.Company
                    });
                    grouped.set(reply.Request_ID, requestReplies);
                    return grouped;
                }, new Map());
            }

            return res.json({
                success: true,
                count: requests.length,
                requests: requests.map(request => ({
                    requestId: request.Request_ID,
                    alumniId: request.Alumni_ID,
                    alumniName: request.Alumni_Name,
                    company: request.Company,
                    requestDate: request.Request_Date,
                    description: request.Description,
                    status: request.Request_Status,
                    replies: repliesByRequest.get(request.Request_ID) || []
                }))
            });
        } catch (error) {
            console.error("Mentorship request retrieval error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve mentorship requests."
            });
        }
    }
);

app.use("/api", (req, res) => {
    return res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

app.use("/api", (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    console.error("API request error:", error.message);
    return res.status(500).json({
        success: false,
        message: "The API request could not be completed."
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`AlumniConnect backend running at http://localhost:${PORT}`);
});