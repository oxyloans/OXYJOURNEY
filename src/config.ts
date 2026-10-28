/** Central backend config. Change the URL here (live by default). */
export const API_BASE_URL = "https://meta.oxyloans.com/api";
// export const API_BASE_URL = "http://localhost:9040/api"; // local backend

/** Login always uses the live backend, even while the rest runs locally. */
export const LOGIN_API_BASE_URL = "https://meta.oxyloans.com/api";

export const API_CONFIG = {
  /** Main API root (vibe code, admin). */
  root: API_BASE_URL,
  /** Message stream endpoint root. */
  stream: API_BASE_URL,
  /** Admin API root. */
  admin: API_BASE_URL,
  /** Login (OTP) API root: always the live backend. */
  login: LOGIN_API_BASE_URL,
  /** Journey chat API root. */
  journeyChat: `${API_BASE_URL}/journey-chat`,
};
