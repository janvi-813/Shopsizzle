import { z } from "zod";

// .coerce.number() means it will convert the string to a number if it's a string
const nullableString = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());
const nullableUrl = z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),

  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: nullableString,

  FRONTEND_URL: z.string().url(),

  POLAR_ACCESS_TOKEN: nullableString,
  POLAR_WEBHOOK_SECRET: nullableString,
  POLAR_API_BASE: z.string().url().default("https://api.polar.sh"),

  POLAR_CHECKOUT_PRODUCT_ID: z.string().uuid(),
  POLAR_PRESENTMENT_CURRENCY: nullableString,
  //POLAR_CHECKOUT_PRODUCT_ID: z.string(),
  STREAM_API_KEY: nullableString,
  STREAM_API_SECRET: nullableString,

  IMAGEKIT_PUBLIC_KEY: nullableString,
  IMAGEKIT_PRIVATE_KEY: nullableString,
  IMAGEKIT_URL_ENDPOINT: nullableUrl,

  SENTRY_DSN: nullableUrl,
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    console.error("Invalid environment variables:", errors);
    throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
  }

  return parsed.data;
}

let cachedEnv: Env | null = null;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }

  return cachedEnv;
}
