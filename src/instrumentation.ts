export async function register() {
  process.env.TZ = process.env.TIMEZONE ?? 'America/Sao_Paulo';
}
