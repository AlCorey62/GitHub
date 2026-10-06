// Projection de la carte des interventions : équirectangulaire à parallèle de référence (MAP.parallel).
import { MAP } from "./site.config.mjs";

const kx = MAP.width / (MAP.lon[1] - MAP.lon[0]);
const ky = kx / Math.cos((MAP.parallel * Math.PI) / 180);

export const WIDTH = MAP.width;
export const HEIGHT = Math.round((MAP.lat[1] - MAP.lat[0]) * ky);
export const project = (lat, lon) => [(lon - MAP.lon[0]) * kx, (MAP.lat[1] - lat) * ky];
export const unproject = (x, y) => [MAP.lat[1] - y / ky, MAP.lon[0] + x / kx];
