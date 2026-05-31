import 'dotenv/config';

export const RESERVATION_EXPIRATION_MS = Number(process.env.RESERVATION_EXPIRATION_MS) || 5 * 60 * 1000;
