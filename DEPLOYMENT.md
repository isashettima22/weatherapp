# Deployment

The app is deployed as a static Vercel frontend with an Express API on Render.

## Render backend

1. Import the Git repository in Render and select the `render.yaml` Blueprint.
2. Set `OPEN_WEATHER_API_KEY` to your OpenWeather API key when prompted. Keep it
   in Render's environment settings; do not commit it to the repository.
3. Deploy the `weatherapp-backend` service and confirm its `/health` route reports
   `{"status":"ok"}`.

## Vercel frontend

1. Import the same Git repository in Vercel.
2. Set the project Root Directory to `frontend`.
3. Add the `RENDER_API_URL` environment variable with the backend's base URL,
   for example `https://weatherapp-backend.onrender.com` (no trailing slash or
   `/api` suffix).
4. Deploy or redeploy the frontend.

The Vercel function in `frontend/api/` proxies `/api/*` requests to Render, so
the frontend does not need a public backend URL or cross-origin browser access.