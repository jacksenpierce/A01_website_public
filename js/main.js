import React, { useEffect, useRef, useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import * as d3 from "https://esm.sh/d3@7.9.0?bundle";
import yaml from "https://esm.sh/js-yaml@4.1.0";

const YAML_CONFIG_URL = "config/sites.yaml";

const DEFAULT_THEME = {
  backgroundColor: "#0b0b0c",
  linkColor: "rgba(255,255,255,0.18)",
  labelFont: "14px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Inter, sans-serif",
  loadingMessage: "Loading graph...",
  loadingTextColor: "#f5f5f5",
  errorMessage: "Check config/sites.yaml for formatting issues."
};

const DEFAULT_META_TITLE = "Signal Links";

const ACTIVE_NODE_COLOR = "#CC5500";
const INACTIVE_NODE_COLOR = "#5B3A24";
const HUB_NODE_COLOR = "#F2721C";

async function fetchGraphConfig() {
  try {
    const response = await fetch(YAML_CONFIG_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${YAML_CONFIG_URL}: ${response.status}`);
    }

    const text = await response.text();
    const yamlDoc = yaml.load(text);
    const parsed = parseYamlGraph(yamlDoc);
    if (!parsed) {
      throw new Error("YAML config did not contain any valid nodes.");
    }

    return { graph: parsed, error: null };
  } catch (error) {
    console.error("Unable to load YAML graph config", error);
    return { graph: DEFAULT_GRAPH, error };
  }
}

function parseYamlGraph(raw) {
  if (!raw) {
    return null;
  }

  const container = Array.isArray(raw) ? { nodes: raw } : raw;
  if (!container || typeof container !== "object") {
    return null;
  }

  const nodesInput = Array.isArray(container.nodes)
    ? container.nodes
    : Array.isArray(raw)
      ? raw
      : [];

  const { nodes, links } = buildNodesFromList(nodesInput);
  if (!nodes.length) {
    return null;
  }

  const meta = {
    title: getString(container.meta?.title) || DEFAULT_META_TITLE
  };

  const theme = applyThemeOverrides(container.theme);

  return {
    meta,
    theme,
    nodes,
    links
  };
}

function applyThemeOverrides(rawTheme) {
  if (!rawTheme || typeof rawTheme !== "object") {
    return { ...DEFAULT_THEME };
  }

  return {
    backgroundColor: getString(rawTheme.backgroundColor) || DEFAULT_THEME.backgroundColor,
    linkColor: getString(rawTheme.linkColor) || DEFAULT_THEME.linkColor,
    labelFont: getString(rawTheme.labelFont) || DEFAULT_THEME.labelFont,
    loadingMessage: getString(rawTheme.loadingMessage) || DEFAULT_THEME.loadingMessage,
    loadingTextColor: getString(rawTheme.loadingTextColor) || DEFAULT_THEME.loadingTextColor,
    errorMessage: getString(rawTheme.errorMessage) || DEFAULT_THEME.errorMessage
  };
}

function buildNodesFromList(entries) {
  const cleaned = [];
  const seen = new Set();

  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const label = getString(entry.label) || getString(entry.name);
    const url = getString(entry.url) || getString(entry.href);
    const explicitId = getString(entry.id);
    const state = normalizeState(entry);

    if (!label || !url || state === "hidden") {
      return;
    }

    const generatedId = explicitId || slugify(label);
    if (!generatedId || seen.has(generatedId)) {
      return;
    }

    seen.add(generatedId);
    cleaned.push({
      id: generatedId,
      label,
      url,
      state,
      wantsHub: entry.hub === true
    });
  });

  if (!cleaned.length) {
    return { nodes: [], links: [] };
  }

  let hubIndex = cleaned.findIndex((item) => item.wantsHub);
  if (hubIndex === -1) {
    hubIndex = 0;
  }

  const hubId = cleaned[hubIndex].id;
  const nodes = cleaned.map((item, index) => {
    const isHub = index === hubIndex;
    const color = isHub ? HUB_NODE_COLOR : ACTIVE_NODE_COLOR;
    const inactiveColor = isHub ? dimHexColor(HUB_NODE_COLOR, 0.36) : INACTIVE_NODE_COLOR;
    const labelColor = "#f5f5f5";
    const strokeColor = isHub ? "#3b1a05" : "#2d1200";
    const baseRadius = isHub ? 28 : 18;
    const pulse = item.state === "inactive" ? 0 : isHub ? 0.08 : 0.06;

    return {
      id: item.id,
      label: item.label,
      href: item.url,
      color: item.state === "inactive" ? inactiveColor : color,
      labelColor,
      shape: isHub ? "square" : "circle",
      radius: baseRadius,
      strokeColor,
      pulse,
      collisionPadding: isHub ? 6 : 4,
      charge: isHub ? -520 : -420,
      renderState: item.state
    };
  });

  const links = nodes
    .filter((node) => node.id !== hubId)
    .map((node) => ({
      source: node.id,
      target: hubId,
      strength: 0.9
    }));

  return { nodes, links };
}

const DEFAULT_GRAPH = (() => {
  const { nodes, links } = buildNodesFromList([
    {
      id: "signal",
      label: "Signal Links",
      url: "https://signal.org/",
      state: "active",
      hub: true
    }
  ]);

  return {
    meta: { title: DEFAULT_META_TITLE },
    theme: { ...DEFAULT_THEME },
    nodes,
    links
  };
})();

function normalizeState(entry) {
  const state = getString(entry.state);
  const normalized = state ? state.toLowerCase() : null;
  if (normalized === "hidden" || normalized === "inactive" || normalized === "active") {
    return normalized;
  }

  if (entry.visible === false) {
    return "hidden";
  }

  if (entry.active === false) {
    return "inactive";
  }

  return "active";
}

function slugify(value) {
  if (!value) return null;
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
  return normalized.length ? normalized : null;
}

function dimHexColor(hex, amount) {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
    return hex;
  }
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const factor = Math.max(0, Math.min(1, 1 - amount));
  const toHex = (value) => {
    const next = Math.round(value * factor)
      .toString(16)
      .padStart(2, "0");
    return next;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function drawNode(ctx, node, time, index, labelFont) {
  const renderState = node.renderState || "active";
  const basePulse = node.pulse || 0;
  const activePulse = renderState === "inactive" ? 0 : basePulse;
  const pulseScale = 1 + activePulse * Math.sin(time * 0.9 + index * 0.7);
  const radius = node.radius * pulseScale;

  ctx.save();
  ctx.globalAlpha = renderState === "inactive" ? 0.4 : 0.65;
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
  ctx.fillStyle = renderState === "inactive" ? "#d6c7ba" : node.labelColor;
  const labelOffset = node.shape === "square" ? radius + 14 : radius + 12;
  ctx.fillText(node.label, node.x || 0, (node.y || 0) - labelOffset);
  ctx.restore();
}

function LandingGraph() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const simulationRef = useRef(null);
  const rafRef = useRef(null);
  const [graphData, setGraphData] = useState(DEFAULT_GRAPH);
  const [loadError, setLoadError] = useState(null);
  const theme = graphData?.theme ?? DEFAULT_THEME;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { graph, error } = await fetchGraphConfig();
        if (!cancelled) {
          setGraphData(graph);
          setLoadError(error);
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
    const activeTheme = graphData.theme ?? DEFAULT_THEME;
    const backgroundColor = activeTheme?.backgroundColor ?? DEFAULT_THEME.backgroundColor;
    const linkColor = activeTheme?.linkColor ?? DEFAULT_THEME.linkColor;
    const labelFont = activeTheme?.labelFont ?? DEFAULT_THEME.labelFont;

    let width = 0;
    let height = 0;
    let dpr = Math.max(1, window.devicePixelRatio || 1);

    function resize() {
      const { width: w, height: h } = container.getBoundingClientRect();
      width = Math.max(200, w);
      height = Math.max(200, h);
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
