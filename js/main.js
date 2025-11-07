import React, { useEffect, useRef, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import * as d3 from "https://esm.sh/d3@7.9.0?bundle";
import graphDocument from "../config/graph.json" assert { type: "json" };

const CONFIG_URL = "config/graph.json";

const DEFAULT_THEME = {
  backgroundColor: "#0b0b0c",
  linkColor: "rgba(255,255,255,0.18)",
  labelFont: "14px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Inter, sans-serif",
  loadingMessage: "Loading graph...",
  loadingTextColor: "#f5f5f5",
  errorMessage: "Using fallback graph; update config/graph.json to customize."
};

const DEFAULT_NODE_DEFAULTS = {
  color: "#CC5500",
  labelColor: "#f5f5f5",
  shape: "circle",
  radius: 18,
  strokeColor: "#2d1200",
  pulse: 0.06,
  collisionPadding: 4,
  charge: -420
};

const DEFAULT_META = {
  title: "Signal Links"
};

const FALLBACK_GRAPH = normalizeGraph(graphDocument, null);

if (!FALLBACK_GRAPH) {
  throw new Error("config/graph.json is missing required data.");
}

if (FALLBACK_GRAPH.meta?.title) {
  document.title = FALLBACK_GRAPH.meta.title;
}

async function fetchGraphConfig() {
  const response = await fetch(CONFIG_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${CONFIG_URL}: ${response.status}`);
  }

  const json = await response.json();
  const normalized = normalizeGraph(json, FALLBACK_GRAPH);
  if (!normalized) {
    throw new Error("Config file did not include any nodes.");
  }
  return normalized;
}

function normalizeGraph(raw, fallback) {
  if (!raw || typeof raw !== "object") {
    return fallback ?? null;
  }

  const defaults = normalizeDefaults(raw.defaults);
  const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const links = Array.isArray(raw.links) ? raw.links : [];
  const seen = new Set();

  const normalizedNodes = nodes
    .map((node, index) => normalizeNode(node, index, defaults.node))
    .filter(Boolean);

  normalizedNodes.forEach((node) => seen.add(node.id));

  if (!normalizedNodes.length) {
    return fallback ?? null;
  }

  const normalizedLinks = links
    .map((link) => normalizeLink(link, seen))
    .filter(Boolean);

  return {
    meta: normalizeMeta(raw.meta),
    theme: defaults.theme,
    defaults: {
      node: defaults.node
    },
    nodes: normalizedNodes,
    links: normalizedLinks
  };
}

function normalizeNode(node, index, defaults) {
  if (!node || typeof node !== "object") {
    return null;
  }

  const nodeDefaults = defaults ?? DEFAULT_NODE_DEFAULTS;
  const id = getString(node.id) || `node-${index + 1}`;
  const label = getString(node.label) || id;
  const href = getString(node.href) || getString(node.url) || null;
  const shape = getString(node.shape) || nodeDefaults.shape;
  const color = getString(node.color) || nodeDefaults.color;
  const labelColor = getString(node.labelColor) || nodeDefaults.labelColor;
  const radius = getNumber(node.radius, nodeDefaults.radius);
  const strokeColor = getString(node.strokeColor) || nodeDefaults.strokeColor;
  const basePulse = getNumber(node.pulse, nodeDefaults.pulse);
  const pulse = shape === "circle" ? basePulse : getNumber(node.pulse, 0);
  const collisionPadding = getNumber(node.collisionPadding, nodeDefaults.collisionPadding);
  const charge = node.charge === null ? null : getNumber(node.charge, nodeDefaults.charge);

  return {
    id,
    label,
    href,
    color,
    labelColor,
    shape,
    radius,
    strokeColor,
    pulse,
    collisionPadding,
    charge
  };
}

function normalizeDefaults(rawDefaults) {
  const theme = normalizeTheme(rawDefaults?.theme);
  const node = normalizeNodeDefaults(rawDefaults?.node);
  return { theme, node };
}

function normalizeTheme(rawTheme) {
  return {
    backgroundColor: getString(rawTheme?.backgroundColor) || DEFAULT_THEME.backgroundColor,
    linkColor: getString(rawTheme?.linkColor) || DEFAULT_THEME.linkColor,
    labelFont: getString(rawTheme?.labelFont) || DEFAULT_THEME.labelFont,
    loadingMessage: getString(rawTheme?.loadingMessage) || DEFAULT_THEME.loadingMessage,
    loadingTextColor: getString(rawTheme?.loadingTextColor) || DEFAULT_THEME.loadingTextColor,
    errorMessage: getString(rawTheme?.errorMessage) || DEFAULT_THEME.errorMessage
  };
}

function normalizeNodeDefaults(rawNodeDefaults) {
  const chargeValue = rawNodeDefaults?.charge;
  return {
    color: getString(rawNodeDefaults?.color) || DEFAULT_NODE_DEFAULTS.color,
    labelColor: getString(rawNodeDefaults?.labelColor) || DEFAULT_NODE_DEFAULTS.labelColor,
    shape: getString(rawNodeDefaults?.shape) || DEFAULT_NODE_DEFAULTS.shape,
    radius: getNumber(rawNodeDefaults?.radius, DEFAULT_NODE_DEFAULTS.radius),
    strokeColor: getString(rawNodeDefaults?.strokeColor) || DEFAULT_NODE_DEFAULTS.strokeColor,
    pulse: getNumber(rawNodeDefaults?.pulse, DEFAULT_NODE_DEFAULTS.pulse),
    collisionPadding: getNumber(rawNodeDefaults?.collisionPadding, DEFAULT_NODE_DEFAULTS.collisionPadding),
    charge: chargeValue === null ? null : getNumber(chargeValue, DEFAULT_NODE_DEFAULTS.charge)
  };
}

function normalizeMeta(rawMeta) {
  return {
    title: getString(rawMeta?.title) || DEFAULT_META.title
  };
}

function normalizeLink(link, nodeSet) {
  if (!link || typeof link !== "object") {
    return null;
  }

  const source = getString(link.source);
  const target = getString(link.target);
  if (!source || !target) {
    return null;
  }

  if (!nodeSet.has(source) || !nodeSet.has(target)) {
    return null;
  }

  return {
    source,
    target,
    strength: getNumber(link.strength, null),
    distance: getNumber(link.distance, null)
  };
}

function getString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function drawNode(ctx, node, time, index, labelFont) {
  const pulseScale = 1 + (node.pulse || 0) * Math.sin(time * 0.9 + index * 0.7);
  const radius = node.radius * pulseScale;

  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.shadowColor = `${node.color}E6`;
  ctx.shadowBlur = 10;
  ctx.fillStyle = node.color;
  if (node.shape === "square") {
    const size = radius * 2 + 4;
    ctx.fillRect((node.x || 0) - size / 2, (node.y || 0) - size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(node.x || 0, node.y || 0, radius + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = node.color;
  ctx.strokeStyle = node.strokeColor;
  ctx.lineWidth = 1;
  if (node.shape === "square") {
    const size = radius * 2;
    const x = (node.x || 0) - size / 2;
    const y = (node.y || 0) - size / 2;
    ctx.fillRect(x, y, size, size);
    ctx.strokeRect(x, y, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.font = getString(labelFont) ||
    "14px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = node.labelColor;
  const labelOffset = node.shape === "square" ? radius + 14 : radius + 12;
  ctx.fillText(node.label, node.x || 0, (node.y || 0) - labelOffset);
  ctx.restore();
}

function LandingGraph() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const simulationRef = useRef(null);
  const rafRef = useRef(null);
  const [graphData, setGraphData] = useState(FALLBACK_GRAPH);
  const [loadError, setLoadError] = useState(null);
  const theme = graphData?.theme ?? FALLBACK_GRAPH.theme ?? DEFAULT_THEME;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const nextGraph = await fetchGraphConfig();
        if (!cancelled) {
          setGraphData(nextGraph);
          setLoadError(null);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadError(error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (graphData?.meta?.title) {
      document.title = graphData.meta.title;
    }
  }, [graphData?.meta?.title]);

  useEffect(() => {
    if (!graphData) {
      return undefined;
    }

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.style.cursor = "grab";

    const nodes = graphData.nodes.map((d) => ({ ...d }));
    const links = graphData.links.map((d) => ({ ...d }));
    const activeTheme = graphData.theme ?? FALLBACK_GRAPH.theme ?? DEFAULT_THEME;
    const backgroundColor = activeTheme?.backgroundColor ?? DEFAULT_THEME.backgroundColor;
    const linkColor = activeTheme?.linkColor ?? DEFAULT_THEME.linkColor;
    const labelFont = activeTheme?.labelFont ?? DEFAULT_THEME.labelFont;

    let width = 0;
    let height = 0;
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    function resize() {
      const { width: w, height: h } = container.getBoundingClientRect();
      width = Math.max(400, w);
      height = Math.max(400, h);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (simulationRef.current) {
        simulationRef.current
          .force("center", d3.forceCenter(width / 2, height / 2))
          .alpha(0.3)
          .restart();
      }
    }

    const defaultLinkDistance = averageLinkDistance(nodes);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((link) => link.distance ?? defaultLinkDistance)
          .strength((link) => link.strength ?? 0.9)
      )
      .force(
        "charge",
        d3.forceManyBody().strength((node) => node.charge ?? -420)
      )
      .force(
        "collision",
        d3.forceCollide().radius((node) => node.radius + (node.collisionPadding || 0))
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alpha(1)
      .alphaTarget(0.02);

    simulationRef.current = simulation;

    let draggingNode = null;
    let downPosition = null;
    let downTime = 0;

    function getPointerPosition(evt) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
      };
    }

    function findNode(x, y) {
      for (let i = nodes.length - 1; i >= 0; --i) {
        const node = nodes[i];
        const dx = x - (node.x || 0);
        const dy = y - (node.y || 0);
        const hitRadius = node.shape === "square" ? (node.radius + 6) * Math.SQRT2 : node.radius + 6;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return node;
        }
      }
      return null;
    }

    function pointerdown(evt) {
      const { x, y } = getPointerPosition(evt);
      const node = findNode(x, y);
      if (!node) return;
      draggingNode = node;
      node.fx = x;
      node.fy = y;
      downPosition = { x, y };
      downTime = performance.now();
      simulation.alphaTarget(0.3).restart();
      canvas.style.cursor = "grabbing";
    }

    function pointermove(evt) {
      if (!draggingNode) return;
      const { x, y } = getPointerPosition(evt);
      draggingNode.fx = x;
      draggingNode.fy = y;
    }

    function pointerup(evt) {
      if (!draggingNode) return;
      const node = draggingNode;
      draggingNode = null;
      node.fx = null;
      node.fy = null;
      simulation.alphaTarget(0.06);
      window.setTimeout(() => simulation.alphaTarget(0.02), 120);
      canvas.style.cursor = "grab";

      const upPosition = getPointerPosition(evt);
      const dx = upPosition.x - (downPosition?.x ?? upPosition.x);
      const dy = upPosition.y - (downPosition?.y ?? upPosition.y);
      const distanceSq = dx * dx + dy * dy;
      const elapsed = performance.now() - downTime;

      if (node.href && distanceSq < 36 && elapsed < 300) {
        window.open(node.href, "_blank", "noopener,noreferrer");
      }

      downPosition = null;
      downTime = 0;
    }

    canvas.addEventListener("pointerdown", pointerdown);
    window.addEventListener("pointermove", pointermove);
    window.addEventListener("pointerup", pointerup);

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    function draw() {
      const time = performance.now() * 0.001;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = linkColor;
      ctx.globalAlpha = 0.9;
      links.forEach((link) => {
        if (!link.source || !link.target) return;
        const source = typeof link.source === "object" ? link.source : nodes.find((n) => n.id === link.source);
        const target = typeof link.target === "object" ? link.target : nodes.find((n) => n.id === link.target);
        if (!source || !target) return;
        ctx.beginPath();
        ctx.moveTo(source.x || 0, source.y || 0);
        ctx.lineTo(target.x || 0, target.y || 0);
        ctx.stroke();
      });
      ctx.restore();

      nodes.forEach((node, index) => drawNode(ctx, node, time, index, labelFont));

      rafRef.current = requestAnimationFrame(draw);
    }

    simulation.on("tick", () => {});
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      simulation.stop();
      canvas.removeEventListener("pointerdown", pointerdown);
      window.removeEventListener("pointermove", pointermove);
      window.removeEventListener("pointerup", pointerup);
      ro.disconnect();
    };
  }, [graphData]);

  return React.createElement(
    "div",
    {
      ref: containerRef,
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme?.backgroundColor ?? DEFAULT_THEME.backgroundColor,
        overflow: "hidden",
        position: "relative"
      }
    },
    React.createElement("canvas", {
      ref: canvasRef,
      role: "img",
      "aria-label": "Configurable force-directed graph"
    }),
    !graphData &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme?.loadingTextColor ?? DEFAULT_THEME.loadingTextColor,
            fontSize: "16px",
            letterSpacing: "0.02em"
          }
        },
        theme?.loadingMessage ?? DEFAULT_THEME.loadingMessage
      ),
    loadError &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            bottom: 16,
            right: 16,
            background: "rgba(0,0,0,0.6)",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            color: theme?.loadingTextColor ?? DEFAULT_THEME.loadingTextColor
          }
        },
        theme?.errorMessage ?? DEFAULT_THEME.errorMessage
      )
  );
}

function averageLinkDistance(nodes) {
  if (!nodes.length) {
    return 160;
  }
  const totalRadius = nodes.reduce((sum, node) => sum + node.radius, 0);
  const averageRadius = totalRadius / nodes.length;
  return Math.max(120, averageRadius * 6);
}

const rootElement = document.getElementById("root");
createRoot(rootElement).render(React.createElement(LandingGraph));
