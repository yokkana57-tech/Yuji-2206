import { Hono } from 'hono';
import { cors } from "hono/cors"
import { sitesRoute } from "./routes/sites";
import { media } from "./routes/media";
import { analytics } from "./routes/analytics";
import { credits } from "./routes/credits";
import { reservationsRoute } from "./routes/reservations";
import { isPlacesConfigured, placesHealth } from "./lib/places";

const app = new Hono()
  .basePath('api')
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .get('/health', (c) => c.json({ status: 'ok' }, 200))
  .get('/config', async (c) => {
    const places = await placesHealth(c.req.query("recheck") === "1");
    return c.json({ placesConfigured: isPlacesConfigured(), places }, 200);
  })
  .route("/sites", sitesRoute)
  .route("/media", media)
  .route("/track", analytics)
  .route("/analytics", analytics)
  .route("/credits", credits)
  .route("/reservations", reservationsRoute);

export type AppType = typeof app;
export default app;
