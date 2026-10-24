function generateAlumniPassword(name, alumniId) {
    if (typeof name !== "string" || !name.trim()) {
        throw new TypeError("A valid alumni name is required.");
    }

    const alumniIdText = typeof alumniId === "string" ? alumniId.trim() : "";
    const normalizedAlumniId = typeof alumniId === "number"
        ? alumniId
        : /^\d+$/.test(alumniIdText)
            ? Number(alumniIdText)
            : NaN;
    if (
        !Number.isSafeInteger(normalizedAlumniId) ||
        normalizedAlumniId <= 0
    ) {
        throw new TypeError("A valid Alumni_ID is required.");
    }

    const normalizedName = name.toLowerCase().replace(/\s/g, "");
    if (!normalizedName) {
        throw new TypeError("A valid alumni name is required.");
    }

    return `${normalizedName}${normalizedAlumniId}`;
}

module.exports = { generateAlumniPassword };
