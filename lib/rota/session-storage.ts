// Shared so the rota app and the scheduler's unlock popup cannot drift onto
// different keys — if they did, unlocking from the sidebar would still land on
// the gate.
export const ROTA_TOKEN_KEY = "rota-session";
