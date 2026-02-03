export type AppMode = { testerMode: boolean };

export function getAppMode(): AppMode {
  if (process.env.NODE_ENV === "production") {
    return { testerMode: false };
  }
  const testerFlag = process.env.NEXT_PUBLIC_TESTER_MODE;
  const testerMode =
    testerFlag === "1" ||
    testerFlag === "true" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  return { testerMode };
}
