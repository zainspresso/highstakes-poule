function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  SUPABASE_URL: required("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  SESSION_SECRET: required("SESSION_SECRET"),
  FOOTBALL_DATA_API_KEY: required("FOOTBALL_DATA_API_KEY"),
  FOOTBALL_DATA_COMPETITION: process.env.FOOTBALL_DATA_COMPETITION ?? "WC",
  CRON_SECRET: process.env.CRON_SECRET ?? "",
};
