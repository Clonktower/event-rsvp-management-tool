import { browser } from "$app/environment";

const isProd = import.meta.env.MODE === "production";

export const API_HOST = isProd
  ? "https://api.rsvp.clonktower.de"
  : browser
    ? `http://${window.location.hostname}:3000`
    : "http://localhost:3000";
