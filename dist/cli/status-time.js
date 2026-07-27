export function formatStatusTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = padDatePart(date.getMonth() + 1);
    const day = padDatePart(date.getDate());
    const hours = padDatePart(date.getHours());
    const minutes = padDatePart(date.getMinutes());
    const seconds = padDatePart(date.getSeconds());
    return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
}
function padDatePart(value) {
    return String(value).padStart(2, "0");
}
//# sourceMappingURL=status-time.js.map