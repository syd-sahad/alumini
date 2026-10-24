const readline = require("readline");
const { generateAlumniPassword } = require("./alumni-password");

function confirmReset() {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        return Promise.reject(
            new Error("Run this reset in an interactive terminal to confirm.")
        );
    }

    const prompt = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        prompt.question(
            "This will reset the password hash for every alumni account. " +
            'Type "RESET ALL ALUMNI PASSWORDS" to continue: ',
            answer => {
                prompt.close();
                resolve(answer.trim() === "RESET ALL ALUMNI PASSWORDS");
            }
        );
    });
}

async function main() {
    if (!(await confirmReset())) {
        console.log("Alumni password reset cancelled. No accounts were changed.");
        return;
    }

    const bcrypt = require("bcryptjs");
    const db = require("./db");
    let connection;
    let transactionStarted = false;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [alumni] = await connection.execute(
            "SELECT Alumni_ID, Name, Email FROM alumni ORDER BY Alumni_ID"
        );
        let updatedCount = 0;

        for (const alumnus of alumni) {
            const password = generateAlumniPassword(
                alumnus.Name,
                alumnus.Alumni_ID
            );
            const passwordHash = await bcrypt.hash(password, 12);
            const [result] = await connection.execute(
                "UPDATE alumni SET Password_Hash = ? WHERE Alumni_ID = ?",
                [passwordHash, alumnus.Alumni_ID]
            );

            if (result.affectedRows !== 1) {
                throw new Error(
                    `Could not update Password_Hash for Alumni_ID ${alumnus.Alumni_ID}.`
                );
            }

            updatedCount += 1;
        }

        await connection.commit();
        transactionStarted = false;
        console.log(
            `Password hashes updated for ${updatedCount} of ${alumni.length} alumni account(s).`
        );
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
        await db.end();
    }
}

main().catch(error => {
    console.error("Alumni password reset failed:", error.message);
    process.exitCode = 1;
});
