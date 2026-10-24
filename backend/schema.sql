-- ============================================================
-- AlumniConnect: Alumni Network and Mentorship Management System
-- Standalone database schema + sample data
-- Database: alumni_mentorship
--
-- IMPORTANT:
-- 1. This is a standalone setup script. It creates tables if absent.
-- 2. CREATE TABLE IF NOT EXISTS does NOT alter existing tables.
-- 3. Review/backup your existing database before running this file.
-- 4. Sample passwords are not provided as plaintext or valid hashes.
--    Use your project's password provisioning/registration flow.
-- ============================================================

CREATE DATABASE IF NOT EXISTS alumni_mentorship
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE alumni_mentorship;

-- Disable FK checks only while creating seed data in dependency order.
-- This script does not DROP or DELETE existing data.

CREATE TABLE IF NOT EXISTS admin (
    Admin_ID INT NOT NULL AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL,
    Password VARCHAR(255) NOT NULL,
    PRIMARY KEY (Admin_ID),
    UNIQUE KEY uq_admin_email (Email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student (
    Student_ID INT NOT NULL AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL,
    Phone VARCHAR(15) DEFAULT NULL,
    Department VARCHAR(100) DEFAULT NULL,
    Year INT DEFAULT NULL,
    Career_Interests TEXT DEFAULT NULL,
    Admin_ID INT DEFAULT NULL,
    Password_Hash VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (Student_ID),
    UNIQUE KEY uq_student_email (Email),
    KEY idx_student_admin_id (Admin_ID),
    CONSTRAINT fk_student_admin_schema
      FOREIGN KEY (Admin_ID) REFERENCES admin (Admin_ID)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni (
    Alumni_ID INT NOT NULL AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL,
    Phone VARCHAR(15) DEFAULT NULL,
    Department VARCHAR(100) DEFAULT NULL,
    Graduation_Year INT DEFAULT NULL,
    Company VARCHAR(150) DEFAULT NULL,
    Job_Role VARCHAR(150) DEFAULT NULL,
    Skills TEXT DEFAULT NULL,
    Admin_ID INT DEFAULT NULL,
    Password_Hash VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (Alumni_ID),
    UNIQUE KEY uq_alumni_email (Email),
    KEY idx_alumni_admin_id (Admin_ID),
    CONSTRAINT fk_alumni_admin_schema
      FOREIGN KEY (Admin_ID) REFERENCES admin (Admin_ID)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_career_interest (
    Student_ID INT NOT NULL,
    Career_Interest VARCHAR(150) NOT NULL,
    PRIMARY KEY (Student_ID, Career_Interest),
    CONSTRAINT fk_sci_student_schema
      FOREIGN KEY (Student_ID) REFERENCES student (Student_ID)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni_skill (
    Alumni_ID INT NOT NULL,
    Skill VARCHAR(150) NOT NULL,
    PRIMARY KEY (Alumni_ID, Skill),
    CONSTRAINT fk_alumni_skill_schema
      FOREIGN KEY (Alumni_ID) REFERENCES alumni (Alumni_ID)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mentorship_request (
    Request_ID INT NOT NULL AUTO_INCREMENT,
    Request_Date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    Description TEXT DEFAULT NULL,
    Status ENUM('Pending','Accepted','Rejected') DEFAULT 'Pending',
    Student_ID INT NOT NULL,
    Alumni_ID INT NOT NULL,
    PRIMARY KEY (Request_ID),
    KEY idx_request_student (Student_ID),
    KEY idx_request_alumni (Alumni_ID),
    CONSTRAINT fk_request_student_schema
      FOREIGN KEY (Student_ID) REFERENCES student (Student_ID),
    CONSTRAINT fk_request_alumni_schema
      FOREIGN KEY (Alumni_ID) REFERENCES alumni (Alumni_ID)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event (
    Event_ID INT NOT NULL AUTO_INCREMENT,
    Event_Name VARCHAR(200) NOT NULL,
    Description TEXT DEFAULT NULL,
    Event_Location VARCHAR(200) DEFAULT NULL,
    Date DATE DEFAULT NULL,
    Time TIME DEFAULT NULL,
    Admin_ID INT DEFAULT NULL,
    PRIMARY KEY (Event_ID),
    KEY idx_event_admin_id (Admin_ID),
    CONSTRAINT fk_event_admin_schema
      FOREIGN KEY (Admin_ID) REFERENCES admin (Admin_ID)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcement (
    Announcement_ID INT NOT NULL AUTO_INCREMENT,
    Title VARCHAR(200) NOT NULL,
    Message TEXT NOT NULL,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Admin_ID INT DEFAULT NULL,
    PRIMARY KEY (Announcement_ID),
    KEY idx_announcement_admin_id (Admin_ID),
    CONSTRAINT fk_announcement_admin_schema
      FOREIGN KEY (Admin_ID) REFERENCES admin (Admin_ID)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mentorship_message (
    Message_ID INT NOT NULL AUTO_INCREMENT,
    Request_ID INT NOT NULL,
    Student_ID INT NOT NULL,
    Alumni_ID INT NOT NULL,
    Message TEXT NOT NULL,
    Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Message_ID),
    KEY idx_message_request (Request_ID),
    KEY idx_message_student (Student_ID),
    KEY idx_message_alumni (Alumni_ID),
    CONSTRAINT fk_message_request_schema
      FOREIGN KEY (Request_ID) REFERENCES mentorship_request (Request_ID),
    CONSTRAINT fk_message_student_schema
      FOREIGN KEY (Student_ID) REFERENCES student (Student_ID),
    CONSTRAINT fk_message_alumni_schema
      FOREIGN KEY (Alumni_ID) REFERENCES alumni (Alumni_ID)
) ENGINE=InnoDB;

-- ============================================================
-- SAMPLE DATA
-- Inserts use NOT EXISTS checks to avoid duplicating sample rows.
-- These are demo records for a fresh/demo database.
-- ============================================================

-- Sample administrator.
-- Replace this placeholder password value with a proper hash created
-- by your application before using an admin login feature.
INSERT INTO admin (Name, Email, Password)
SELECT 'AlumniConnect Admin', 'admin@alumniconnect.example',
       'REPLACE_WITH_BCRYPT_HASH'
WHERE NOT EXISTS (
    SELECT 1 FROM admin WHERE Email = 'admin@alumniconnect.example'
);

-- Sample students. Password_Hash is NULL until registered/provisioned
-- through the application. These records are for directory/demo use.
INSERT INTO student
    (Name, Email, Phone, Department, Year, Career_Interests, Admin_ID, Password_Hash)
SELECT 'Anu Thomas', 'anu.thomas.demo@example.com', '9876500001',
       'Information Technology', 3, 'Web Development, Data Analytics', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM student WHERE Email = 'anu.thomas.demo@example.com');

INSERT INTO student
    (Name, Email, Phone, Department, Year, Career_Interests, Admin_ID, Password_Hash)
SELECT 'Rahul Nair', 'rahul.nair.demo@example.com', '9876500002',
       'Information Technology', 2, 'Cybersecurity, Cloud Computing', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM student WHERE Email = 'rahul.nair.demo@example.com');

-- Sample alumni directory records. These are demo profiles; password hashes
-- remain NULL until the administrator explicitly runs the alumni password
-- reset utility after the seed runs.
INSERT INTO alumni
    (Name, Email, Phone, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Arjun Menon', 'arjun.menon@example.com', NULL,
       'Information Technology', 2022, 'Tech Solutions', 'Software Engineer',
       'Java, SQL, Web Development', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'arjun.menon@example.com');

INSERT INTO alumni
    (Name, Email, Phone, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Anjali Nair', 'anjali.nair@example.com', NULL,
       'Information Technology', 2021, 'DataWorks', 'Data Analyst',
       'Python, SQL, Power BI', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'anjali.nair@example.com');

INSERT INTO alumni
    (Name, Email, Phone, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Rahul Kumar', 'rahul.kumar@example.com', NULL,
       'Computer Science', 2023, 'CloudNine', 'Cloud Engineer',
       'Linux, AWS, Networking', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'rahul.kumar@example.com');

INSERT INTO alumni
    (Name, Email, Phone, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Meera Krishnan', 'meera.krishnan@example.com', NULL,
       'Information Technology', 2020, 'Design Hub', 'UI/UX Designer',
       'Figma, UX Research, Prototyping', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'meera.krishnan@example.com');

INSERT INTO alumni
    (Name, Email, Phone, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Adithya Raj', 'adithya.raj@example.com', NULL,
       'Electronics and Communication', 2022, 'Embedded Systems Ltd', 'Embedded Engineer',
       'C, Microcontrollers, IoT', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'adithya.raj@example.com');

INSERT INTO alumni
    (Name, Email, Phone, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Sneha Thomas', 'sneha.thomas@example.com', NULL,
       'Information Technology', 2023, 'WebCraft', 'Frontend Developer',
       'HTML, CSS, JavaScript, React', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'sneha.thomas@example.com');

INSERT INTO alumni
    (Name, Email, Phone, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Vishnu Prasad', 'vishnu.prasad@example.com', NULL,
       'Computer Science', 2021, 'SecureNet', 'Security Analyst',
       'Networking, Linux, Security', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'vishnu.prasad@example.com');

INSERT INTO alumni
    (Name, Email, Phone, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Diya Suresh', 'diya.suresh@example.com', NULL,
       'Information Technology', 2024, 'DataSpring', 'Junior Data Analyst',
       'Python, Excel, SQL', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'diya.suresh@example.com');

-- Extra test alumni records from the project dataset.
INSERT INTO alumni
    (Name, Email, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Nikhil Varma', 'nikhil.varma.test01@example.com',
       'Information Technology', 2022, 'Tech Solutions', 'Backend Developer',
       'Node.js, MySQL, Express', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'nikhil.varma.test01@example.com');

INSERT INTO alumni
    (Name, Email, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Amala Joseph', 'amala.joseph.test02@example.com',
       'Computer Science', 2021, 'DataWorks', 'Data Engineer',
       'Python, SQL, ETL', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'amala.joseph.test02@example.com');

INSERT INTO alumni
    (Name, Email, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Rohan Das', 'rohan.das.test03@example.com',
       'Information Technology', 2023, 'CloudNine', 'Cloud Associate',
       'AWS, Linux, Docker', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'rohan.das.test03@example.com');

INSERT INTO alumni
    (Name, Email, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Neha Pillai', 'neha.pillai.test04@example.com',
       'Information Technology', 2020, 'Design Hub', 'Product Designer',
       'Figma, UI Design, Prototyping', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'neha.pillai.test04@example.com');

INSERT INTO alumni
    (Name, Email, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Akhil Raj', 'akhil.raj.test05@example.com',
       'Electronics and Communication', 2022, 'Embedded Systems Ltd', 'Embedded Engineer',
       'C, Embedded C, IoT', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'akhil.raj.test05@example.com');

INSERT INTO alumni
    (Name, Email, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Fathima Ali', 'fathima.ali.test06@example.com',
       'Information Technology', 2023, 'WebCraft', 'Web Developer',
       'JavaScript, React, CSS', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'fathima.ali.test06@example.com');

INSERT INTO alumni
    (Name, Email, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Vivek Mohan', 'vivek.mohan.test07@example.com',
       'Computer Science', 2021, 'SecureNet', 'Security Analyst',
       'Cybersecurity, Networking, Linux', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'vivek.mohan.test07@example.com');

INSERT INTO alumni
    (Name, Email, Department, Graduation_Year, Company, Job_Role, Skills, Admin_ID, Password_Hash)
SELECT 'Sandra Paul', 'sandra.paul.test08@example.com',
       'Information Technology', 2024, 'DataSpring', 'Data Analyst',
       'Python, Excel, SQL', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM alumni WHERE Email = 'sandra.paul.test08@example.com');

-- Populate normalized career-interest rows for the demo students.
INSERT IGNORE INTO student_career_interest (Student_ID, Career_Interest)
SELECT Student_ID, 'Web Development'
FROM student WHERE Email = 'anu.thomas.demo@example.com';

INSERT IGNORE INTO student_career_interest (Student_ID, Career_Interest)
SELECT Student_ID, 'Data Analytics'
FROM student WHERE Email = 'anu.thomas.demo@example.com';

INSERT IGNORE INTO student_career_interest (Student_ID, Career_Interest)
SELECT Student_ID, 'Cybersecurity'
FROM student WHERE Email = 'rahul.nair.demo@example.com';

INSERT IGNORE INTO student_career_interest (Student_ID, Career_Interest)
SELECT Student_ID, 'Cloud Computing'
FROM student WHERE Email = 'rahul.nair.demo@example.com';

-- Populate normalized alumni skills for sample alumni.
INSERT IGNORE INTO alumni_skill (Alumni_ID, Skill)
SELECT Alumni_ID, 'Java'
FROM alumni WHERE Email = 'arjun.menon@example.com';

INSERT IGNORE INTO alumni_skill (Alumni_ID, Skill)
SELECT Alumni_ID, 'SQL'
FROM alumni WHERE Email = 'arjun.menon@example.com';

INSERT IGNORE INTO alumni_skill (Alumni_ID, Skill)
SELECT Alumni_ID, 'Python'
FROM alumni WHERE Email = 'anjali.nair@example.com';

INSERT IGNORE INTO alumni_skill (Alumni_ID, Skill)
SELECT Alumni_ID, 'SQL'
FROM alumni WHERE Email = 'anjali.nair@example.com';

-- Sample events matching the project demo data.
INSERT INTO event (Event_Name, Description, Event_Location, Date, Time, Admin_ID)
SELECT 'Alumni Meet 2026',
       'Networking event for students and alumni.',
       'College Auditorium', '2026-11-15', '10:00:00', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM event
    WHERE Event_Name = 'Alumni Meet 2026' AND Date = '2026-11-15'
);

INSERT INTO event (Event_Name, Description, Event_Location, Date, Time, Admin_ID)
SELECT 'Career Guidance Workshop',
       'Career planning and professional guidance session.',
       'Seminar Hall', '2026-11-20', '14:00:00', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM event
    WHERE Event_Name = 'Career Guidance Workshop' AND Date = '2026-11-20'
);

INSERT INTO event (Event_Name, Description, Event_Location, Date, Time, Admin_ID)
SELECT 'Technical Networking Session',
       'A technical discussion and networking session.',
       'Computer Lab', '2026-11-25', '11:00:00', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM event
    WHERE Event_Name = 'Technical Networking Session' AND Date = '2026-11-25'
);

-- Sample announcement matching the project demo.
INSERT INTO announcement (Title, Message, Admin_ID)
SELECT
    'AlumniConnect Mentorship Program',
    'Students can explore alumni profiles and submit mentorship requests to receive career guidance, industry insights, and professional development advice.',
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM announcement
    WHERE Title = 'AlumniConnect Mentorship Program'
);

-- Optional sample mentorship request.
-- It is added only if the sample student and alumni exist and no matching
-- request already exists.
INSERT INTO mentorship_request (Student_ID, Alumni_ID, Description, Status)
SELECT s.Student_ID, a.Alumni_ID,
       'I would like guidance on starting a career in software development.',
       'Pending'
FROM student s
JOIN alumni a ON a.Email = 'arjun.menon@example.com'
WHERE s.Email = 'anu.thomas.demo@example.com'
  AND NOT EXISTS (
      SELECT 1
      FROM mentorship_request mr
      WHERE mr.Student_ID = s.Student_ID
        AND mr.Alumni_ID = a.Alumni_ID
        AND mr.Description =
          'I would like guidance on starting a career in software development.'
  );

-- ============================================================
-- BASIC VERIFICATION QUERIES
-- ============================================================

SELECT 'admin' AS table_name, COUNT(*) AS row_count FROM admin
UNION ALL
SELECT 'student', COUNT(*) FROM student
UNION ALL
SELECT 'alumni', COUNT(*) FROM alumni
UNION ALL
SELECT 'student_career_interest', COUNT(*) FROM student_career_interest
UNION ALL
SELECT 'alumni_skill', COUNT(*) FROM alumni_skill
UNION ALL
SELECT 'mentorship_request', COUNT(*) FROM mentorship_request
UNION ALL
SELECT 'event', COUNT(*) FROM event
UNION ALL
SELECT 'announcement', COUNT(*) FROM announcement
UNION ALL
SELECT 'mentorship_message', COUNT(*) FROM mentorship_message;
