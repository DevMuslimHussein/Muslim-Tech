/**
 * Cookies are scoped by host, NOT by port — so on localhost the student and
 * admin apps share one jar and would overwrite each other's session. Giving
 * each app its own cookie names keeps the two logins independent no matter
 * where they are served from.
 */
export const ACCESS_COOKIE = "mt_student_access";
export const REFRESH_COOKIE = "mt_student_refresh";
