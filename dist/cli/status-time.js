export function formatStatusTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = padDatePart(date.getMonth() + 1);
    const day = padDatePart(date.getDate());
    const hours = padDatePart(date.getHours());
    const minutes = padDatePart(date.getMinutes());
    return `[${year}-${month}-${day} ${hours}:${minutes}]`;
}
function padDatePart(value) {
    return String(value).padStart(2, "0");
}
//# sourceMappingURL=status-time.js.map