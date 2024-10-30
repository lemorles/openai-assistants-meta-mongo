interface Config {
  PORT: string | number;
  ASSISTANT_ID: string;
  JWT_TOKEN: string;
  NUMBER_ID: string;
  VERIFY_TOKEN: string;
  META_VERSION: string;
  DB_URI: string;
  DB_NAME: string;
}

export const config: Config = {
  PORT: process.env.PORT ?? 3008,
  ASSISTANT_ID: process.env.ASSISTANT_ID ?? "",
  JWT_TOKEN: process.env.JWT_TOKEN,
  NUMBER_ID: process.env.NUMBER_ID,
  VERIFY_TOKEN: process.env.VERIFY_TOKEN,
  META_VERSION: process.env.META_VERSION,
  DB_URI: process.env.MONGO_DB_URI,
  DB_NAME: process.env.MONGO_DB_NAME,
};
