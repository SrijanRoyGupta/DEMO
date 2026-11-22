import { createServerFn } from "@tanstack/react-start";

export const getLiveNetwork = createServerFn({ method: "GET" }).handler(async () => {
  const { assembleNetwork } = await import("./meteo.server");
  return assembleNetwork();
});

export const searchPlace = createServerFn({ method: "POST" })
  .validator((data: { query: string }) => {
    if (!data || typeof data.query !== "string") throw new Error("Enter a location");
    const query = data.query.trim();
    if (query.length < 2) throw new Error("Enter a location");
    return { query };
  })
  .handler(async ({ data }) => {
    const { searchAndAnalyze } = await import("./meteo.server");
    return searchAndAnalyze(data.query);
  });
