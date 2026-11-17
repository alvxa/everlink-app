"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";
import { geoCentroid, geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { COUNTRY_MAP } from "@/lib/countries";
import { Skeleton } from "@/components/ui/misc";

type CountryStat = { code: string; members: number; posts: number; communities: number };
type Shape = { d: string; name: string; code: string | null };
type Marker = { code: string; name: string; x: number; y: number; activity: number; radius: number };

const NAME_ALIASES: Record<string, string> = {
  "W. Sahara": "EH",
  "United States of America": "US",
  "Dem. Rep. Congo": "CD",
  "Dominican Rep.": "DO",
  "Falkland Is.": "FK",
  "Fr. S. Antarctic Lands": "TF",
  "Côte d'Ivoire": "CI",
  "Central African Rep.": "CF",
  "Eq. Guinea": "GQ",
  Turkey: "TR",
  "Solomon Is.": "SB",
  "Bosnia and Herz.": "BA",
  Macedonia: "MK",
  "S. Sudan": "SS",
};

function normalize(name: string) {
  return name
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_TO_CODE = new Map<string, string>();
for (const country of COUNTRY_MAP.values()) NAME_TO_CODE.set(normalize(country.name), country.code);

function codeForFeature(featureItem: Feature<Geometry, { name?: string }>) {
  const name = featureItem.properties?.name;
  if (!name) return null;
  const alias = NAME_ALIASES[name] ?? NAME_TO_CODE.get(normalize(name));
  return alias && COUNTRY_MAP.has(alias) ? alias : null;
}

const WIDTH = 900;
const HEIGHT = 460;

export function WorldMap({ countries, active }: { countries: CountryStat[]; active?: string | null }) {
  const router = useRouter();
  const [geo, setGeo] = React.useState<FeatureCollection<Geometry, { name?: string }> | null>(null);
  const [hover, setHover] = React.useState<{ x: number; y: number; name: string; code: string | null } | null>(null);

  const stats = React.useMemo(() => new Map(countries.map((country) => [country.code, country])), [countries]);
  const maxActivity = Math.max(1, ...countries.map((country) => country.members + country.posts + country.communities));

  React.useEffect(() => {
    let cancelled = false;
    fetch("/geo/countries-110m.json")
      .then((response) => response.json())
      .then((raw) => {
        if (cancelled) return;
        const topology = raw as Topology;
        const collection = feature(
          topology,
          topology.objects.countries as GeometryCollection
        ) as unknown as FeatureCollection<Geometry, { name?: string }>;
        setGeo(collection);
      })
      .catch(() => setGeo(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const shapes = React.useMemo(() => {
    if (!geo) return [];
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], geo);
    const path = geoPath(projection);
    return geo.features
      .map((shape) => {
        const d = path(shape as GeoPermissibleObjects);
        if (!d) return null;
        const name = shape.properties?.name ?? "Country";
        const code = codeForFeature(shape);
        return { d, name, code };
      })
      .filter((shape): shape is Shape => Boolean(shape));
  }, [geo]);

  const markers = React.useMemo(() => {
    if (!geo) return [] as Marker[];
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], geo);
    const nextMarkers: Marker[] = [];
    for (const shape of geo.features) {
      const code = codeForFeature(shape);
      const stat = code ? stats.get(code) : undefined;
      if (!code || !stat) continue;
      const point = projection(geoCentroid(shape as GeoPermissibleObjects));
      if (!point) continue;
      const activity = stat.members + stat.posts + stat.communities;
      nextMarkers.push({
        code,
        name: shape.properties?.name ?? "Country",
        x: point[0],
        y: point[1],
        activity,
        radius: 2.4 + 3.6 * (activity / maxActivity),
      });
    }
    nextMarkers.sort((a, b) => b.activity - a.activity);
    return nextMarkers.slice(0, 48);
  }, [geo, stats, maxActivity]);

  function navigate(code: string | null) {
    if (!code) return;
    router.push(`/world?country=${code}`);
  }

  if (!geo) {
    return (
      <div className="surface-card p-4">
        <Skeleton className="h-[280px] w-full rounded-2xl sm:h-[360px]" />
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="panel-header">
        <span className="icon-tile">
          <Globe2 className="h-4 w-4" />
        </span>
        <h2 className="panel-title">World map</h2>
        {countries.length > 0 && (
          <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-faint dark:border-white/10 dark:bg-white/[0.05]">
            {countries.length} {countries.length === 1 ? "hub" : "hubs"}
          </span>
        )}
        <span className="ml-auto hidden text-[11px] text-ink-faint sm:inline">Click a country to open its hub</span>
      </div>
      <div className="relative p-2 sm:p-3">
        <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] bg-[radial-gradient(circle_at_50%_48%,rgba(139,92,246,.09),rgba(39,153,232,.05)_55%,transparent_76%)] dark:bg-[radial-gradient(circle_at_50%_48%,rgba(139,92,246,.2),rgba(37,99,235,.1)_55%,transparent_72%)]" />
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="relative h-auto w-full"
          role="img"
          aria-label="World map of Everlink activity by country"
        >
          <defs>
            <linearGradient id="world-active" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a5b4fc" />
              <stop offset="50%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
            <filter id="world-marker-glow" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        {shapes.map((shape) => {
          const stat = shape.code ? stats.get(shape.code) : undefined;
          const activity = stat ? stat.members + stat.posts + stat.communities : 0;
          const intensity = activity ? 0.45 + 0.55 * (activity / maxActivity) : 0;
          const isActive = active && shape.code === active;
          return (
            <path
              key={shape.name + (shape.d ?? "")}
              d={shape.d}
              fill={isActive || activity ? "url(#world-active)" : "hsl(var(--surface-3))"}
              fillOpacity={isActive ? 1 : intensity || 1}
              stroke={isActive ? "hsl(var(--brand))" : "rgba(139,92,246,.26)"}
              strokeWidth={isActive ? 1.6 : 0.6}
              style={activity ? { filter: "drop-shadow(0 0 5px rgba(167,139,250,0.32))" } : undefined}
              className={shape.code ? "cursor-pointer" : undefined}
              tabIndex={shape.code ? 0 : -1}
              role={shape.code ? "button" : undefined}
              aria-label={shape.code ? `${shape.name}${stat ? `, ${stat.members} members` : ""}` : shape.name}
              onMouseMove={(event) => {
                const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (!rect) return;
                setHover({
                  x: ((event.clientX - rect.left) / rect.width) * 100,
                  y: ((event.clientY - rect.top) / rect.height) * 100,
                  name: shape.name,
                  code: shape.code,
                });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => navigate(shape.code)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(shape.code);
                }
              }}
            />
          );
        })}
          <g pointerEvents="none">
            {markers.map((marker) => (
              <g key={marker.code} transform={`translate(${marker.x},${marker.y})`}>
                <circle
                  r={marker.radius * 2.4}
                  fill="url(#world-active)"
                  opacity={0.18}
                  className="motion-safe:animate-pulse-ring"
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                />
                <circle
                  r={marker.radius}
                  fill="url(#world-active)"
                  stroke="#ffffff"
                  strokeWidth={active === marker.code ? 1.6 : 0.9}
                  strokeOpacity={0.9}
                  filter="url(#world-marker-glow)"
                />
              </g>
            ))}
          </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-[#111228]/95 px-3 py-1.5 text-[11.5px] font-medium text-white shadow-[0_16px_40px_-20px_rgba(17,24,39,.75)] backdrop-blur"
          style={{ left: `${hover.x}%`, top: `${hover.y}%` }}
        >
          {hover.name}
          {hover.code && stats.get(hover.code) && (
            <span className="ml-1.5 text-white/70">
              {stats.get(hover.code)!.members} {stats.get(hover.code)!.members === 1 ? "member" : "members"} ·{" "}
              {stats.get(hover.code)!.posts} {stats.get(hover.code)!.posts === 1 ? "post" : "posts"}
            </span>
          )}
          {!hover.code && <span className="ml-1.5 text-white/60">No hub yet</span>}
        </div>
      )}

      <div className="relative mt-2 flex flex-wrap items-center justify-between gap-2 px-1 pb-1 text-[11px] text-ink-faint">
        <span>Click a country to open its hub.</span>
        <span className="inline-flex items-center gap-1.5">
          Activity
          <span className="text-[10px]">Low</span>
          <span className="h-2 w-24 rounded-full bg-gradient-to-r from-electric/20 via-ocean/60 to-mint" />
          <span className="text-[10px]">High</span>
        </span>
      </div>
      </div>
    </div>
  );
}
