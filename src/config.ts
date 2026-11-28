/** Live backend used by every deployed and local frontend run. */
export const API_BASE_URL = "https://meta.oxyloans.com/api";

// Local backend option — keep commented unless explicitly testing the local API.
// export const API_BASE_URL = "http://localhost:9040/api";

/** Login (OTP) API root. */
export const LOGIN_API_BASE_URL = "https://meta.oxyloans.com/api";

export const API_CONFIG = {
  /** Main API root (vibe code, admin). */
  root: API_BASE_URL,
  /** Message stream endpoint root. */
  stream: API_BASE_URL,
  /** Admin API root. */
  admin: API_BASE_URL,
  /** Login (OTP) API root. */
  login: LOGIN_API_BASE_URL,
  /** Business card upload root. */
  businessCard: API_BASE_URL,
  /** Journey chat API root. */
  journeyChat: `${API_BASE_URL}/journey-chat`,
};
