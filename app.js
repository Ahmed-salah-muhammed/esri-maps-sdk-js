const esriConfig = await $arcgis.import("@arcgis/core/config.js");

import { API_KEY, Egypt_Gov_URL, Reporting } from "./config.js"; // removed ROUTES_URL/STOPS_URL — metro layers are not part of this task

esriConfig.apiKey = API_KEY;

const mapEl = document.getElementById("mapEl");
const reactiveUtils = await $arcgis.import(
  "@arcgis/core/core/reactiveUtils.js",
);

const FeatureLayer = await $arcgis.import(
  "@arcgis/core/layers/FeatureLayer.js",
);
const ClassBreaksRenderer = await $arcgis.import(
  "@arcgis/core/renderers/ClassBreaksRenderer.js",
);
const UniqueValueRenderer = await $arcgis.import(
  "@arcgis/core/renderers/UniqueValueRenderer.js",
);
const SimpleFillSymbol = await $arcgis.import(
  "@arcgis/core/symbols/SimpleFillSymbol.js",
);
const SimpleMarkerSymbol = await $arcgis.import(
  "@arcgis/core/symbols/SimpleMarkerSymbol.js",
);
const SimpleLineSymbol = await $arcgis.import(
  "@arcgis/core/symbols/SimpleLineSymbol.js",
);
const LayerSearchSource = await $arcgis.import(
  "@arcgis/core/widgets/Search/LayerSearchSource.js",
);
const Graphic = await $arcgis.import("@arcgis/core/Graphic.js");

const reportingRenderer = new UniqueValueRenderer({
  field: "IssueType",
  legendOptions: { title: "Reported Issues" },
  uniqueValueInfos: [
    {
      value: 0, // Violating Building
      label: "Violating Building",
      symbol: new SimpleMarkerSymbol({
        style: "square",
        color: "#D62828",
        size: 10,
        outline: new SimpleLineSymbol({ width: 1, color: "#ffffff" }),
      }),
    },
    {
      value: 1, // Street Issue
      label: "Street Issue",
      symbol: new SimpleMarkerSymbol({
        style: "circle",
        color: "#005B99",
        size: 10,
        outline: new SimpleLineSymbol({ width: 1, color: "#ffffff" }),
      }),
    },
  ],
});

const reportingLayer = new FeatureLayer({
  url: Reporting,
  title: "Operational Issues",
  outFields: ["*"],
  renderer: reportingRenderer,
  popupTemplate: {
    title: "{IssueType}",
    content: "<p>{Description}</p><p>Reported at: {ReportedAt}</p>",
  },
});

const classBreaksRenderer = new ClassBreaksRenderer({
  field: "population",
  legendOptions: {
    title: "Population",
  },
  defaultSymbol: new SimpleFillSymbol({
    color: "lightgray",
    outline: { color: "white", width: 0.5 },
  }),
  defaultLabel: "No data",
  classBreakInfos: [
    {
      minValue: 111755,
      maxValue: 143180,
      symbol: new SimpleFillSymbol({
        color: "#1b7837",
        outline: { color: "white", width: 0.5 },
      }),
      label: "< 143,180",
    },
    {
      minValue: 143180,
      maxValue: 2743595,
      symbol: new SimpleFillSymbol({
        color: "#80ac7b",
        outline: { color: "white", width: 0.5 },
      }),
      label: "143,180 – 2,743,595",
    },
    {
      minValue: 2743595,
      maxValue: 5344010,
      symbol: new SimpleFillSymbol({
        color: "#f7f7f7",
        outline: { color: "white", width: 0.5 },
      }),
      label: "2,743,595 – 5,344,010",
    },
    {
      minValue: 5344010,
      maxValue: 7944425,
      symbol: new SimpleFillSymbol({
        color: "#945ead",
        outline: { color: "white", width: 0.5 },
      }),
      label: "5,344,010 – 7,944,425",
    },
    {
      minValue: 7944425,
      maxValue: 9995178,
      symbol: new SimpleFillSymbol({
        color: "#762a83",
        outline: { color: "white", width: 0.5 },
      }),
      label: "> 7,944,425",
    },
  ],
});

const options = {
  duration: 5000, // goTo animation duration in milliseconds (5s)
  easing: "ease-in-out",
};

const EgyptGovLayer = new FeatureLayer({
  url: Egypt_Gov_URL,
  title: "Egypt Government",
  outFields: ["*"],
  renderer: classBreaksRenderer,
  popupTemplate: {
    title: "{name_en} Governorate",
    content:
      "<p>The governorate of <b>{name_en}</b> " +
      "(<b>{name_ar}</b>) is home to " +
      "<b>{population}</b> residents.</p>" +
      "<ul>" +
      "<li>Total Population: <b>{population}</b> people</li>" +
      "<li>Area: <b>{expression/area-km}</b> km²</li>" +
      "<li>Population Density: <b>{expression/density}</b> people/km²</li>" +
      "</ul>",
    // arcade expression
    expressionInfos: [
      {
        name: "area-km",
        title: "Area in km²",
        expression: "Round($feature.Shape__Area / 1000000, 2)",
      },
      {
        name: "density",
        title: "Population Density",
        expression:
          "Round($feature.population / ($feature.Shape__Area / 1000000), 1)",
      },
    ],
    fieldInfos: [
      {
        fieldName: "population",
        format: { digitSeparator: true, places: 0 },
      },
    ],
  },
});

await customElements.whenDefined("arcgis-map");
await new Promise((resolve) => {
  if (mapEl.ready) {
    resolve();
    return;
  }
  const handler = () => {
    if (mapEl.ready) {
      mapEl.removeEventListener("arcgisViewReadyChange", handler);
      resolve();
    }
  };
  mapEl.addEventListener("arcgisViewReadyChange", handler);
});

const view = mapEl.view;
const mymap = mapEl.map;

mymap.addMany([EgyptGovLayer, reportingLayer]);

view.goTo(
  {
    center: [27, 27],
    zoom: 5,
  },
  options,
);

await EgyptGovLayer.when();

const searchEl = document.getElementById("searchEl");
if (searchEl) {
  await customElements.whenDefined("arcgis-search");
  searchEl.includeDefaultSources = false; //stop esri geocoding server
  searchEl.sources = [
    new LayerSearchSource({
      layer: EgyptGovLayer,
      searchFields: ["name_en", "name_ar"],
      displayField: "name_en",
      exactMatch: false,
      name: "Egypt Governorates",
      placeholder: "Search for a governorate...",
      outFields: ["*"],
      maxResults: 6,
      maxSuggestions: 6,
      suggestionsEnabled: true,
      minSuggestCharacters: 1,
    }),
  ];
}

const totalEl = document.getElementById("total-count");
const visibleEl = document.getElementById("visible-count");
const popEl = document.getElementById("population-sum");

const total = await EgyptGovLayer.queryFeatureCount({ where: "1=1" });
totalEl.textContent = total.toLocaleString();

const updateVisibleStats = async () => {
  if (!view.extent) return;
  const [visibleCount, popStats] = await Promise.all([
    EgyptGovLayer.queryFeatureCount({
      geometry: view.extent,
      spatialRelationship: "intersects",
    }),
    EgyptGovLayer.queryFeatures({
      geometry: view.extent,
      spatialRelationship: "intersects",
      outStatistics: [
        {
          statisticType: "sum",
          onStatisticField: "population",
          outStatisticFieldName: "totalPop",
        },
      ],
    }),
  ]);

  visibleEl.textContent = visibleCount.toLocaleString();
  const totalPop = popStats.features[0]?.attributes?.totalPop ?? 0;
  popEl.textContent = totalPop.toLocaleString();
};

updateVisibleStats();

reactiveUtils.watch(
  () => view.stationary,
  (isStationary) => {
    if (isStationary) updateVisibleStats();
  },
);

const portalItem = mymap.portalItem;
if (portalItem) {
  const { title, thumbnailUrl, snippet, modified, tags } = portalItem;
  document.getElementById("app-heading").heading = `${title} Explorer`;
  document.getElementById("card-heading").innerHTML = title;
  document.getElementById("card-thumbnail").src = thumbnailUrl;
  document.getElementById("card-description").innerHTML =
    `<p>${snippet}</p><p>Last modified on ${modified}.</p>`;
  tags?.forEach((tag) => {
    document.getElementById("card-tags").innerHTML +=
      `<calcite-chip>${tag}</calcite-chip>`;
  });
}

const loader = document.getElementById("app-loader");
if (loader) loader.hidden = true;
document.getElementById("app-heading").removeAttribute("hidden");

let activeWidget;
const handleActionBarClick = ({ target }) => {
  if (target.tagName !== "CALCITE-ACTION") {
    return;
  }
  if (!target.dataset.actionId) {
    return;
  }
  if (activeWidget) {
    document.querySelector(`[data-action-id=${activeWidget}]`).active = false;
    document.querySelector(`[data-block-id=${activeWidget}]`).hidden = true;
  }
  const nextWidget = target.dataset.actionId;
  if (nextWidget !== activeWidget) {
    document.querySelector(`[data-action-id=${nextWidget}]`).active = true;
    document.querySelector(`[data-block-id=${nextWidget}]`).hidden = false;
    activeWidget = nextWidget;
  } else {
    activeWidget = null;
  }
};
document
  .querySelector("calcite-action-bar")
  .addEventListener("click", handleActionBarClick);

const issueTypeSelect = document.getElementById("issueTypeSelect");
const issueDescription = document.getElementById("issueDescription");
const reportLocationBtn = document.getElementById("reportLocationBtn");
const submitReportBtn = document.getElementById("submitReportBtn");
const reportStatus = document.getElementById("reportStatus");

let placingReport = false;
let clickHandle = null;
let pendingPoint = null;
let pendingGraphic = null;
const showStatus = (message, kind = "info") => {
  reportStatus.kind = kind; // "success" | "danger" | "warning" | "info"
  reportStatus.querySelector("[slot=message]").textContent = message;
  reportStatus.hidden = false;
};

const clearPendingGraphic = () => {
  if (pendingGraphic) {
    view.graphics.remove(pendingGraphic);
    pendingGraphic = null;
  }
};

const stopPlacing = () => {
  placingReport = false;
  reportLocationBtn.loading = false;
  reportLocationBtn.iconStart = "pin";
  reportLocationBtn.textContent = "Click map location";
  view.container.style.cursor = "default";
  if (clickHandle) {
    clickHandle.remove();
    clickHandle = null;
  }
};

const updateSubmitState = () => {
  const ready = !!pendingPoint && issueDescription.value.trim().length > 0;
  submitReportBtn.disabled = !ready;
};

const setPendingLocation = (mapPoint) => {
  pendingPoint = mapPoint;
  clearPendingGraphic();
  pendingGraphic = new Graphic({
    geometry: mapPoint,
    symbol: new SimpleMarkerSymbol({
      style: "diamond",
      color: "#f4a300",
      size: 14,
      outline: new SimpleLineSymbol({ width: 1.5, color: "#ffffff" }),
    }),
  });
  view.graphics.add(pendingGraphic);
  updateSubmitState(); // enable Submit only if the description is also filled
  showStatus(
    issueDescription.value.trim()
      ? "Ready — click Submit to save the report."
      : "Location set. Add a description to enable Submit.",
    "info",
  );
};

const submitReport = async () => {
  if (submitReportBtn.disabled) return; // guard: fields not all ready yet
  submitReportBtn.loading = true;

  const newFeature = {
    geometry: pendingPoint,
    attributes: {
      IssueType: Number(issueTypeSelect.value),
      Description: issueDescription.value.trim(),
      ReportedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    },
  };

  try {
    const result = await reportingLayer.applyEdits({
      addFeatures: [newFeature],
    });
    const edit = result.addFeatureResults[0];
    if (edit.error) throw edit.error;

    showStatus("Issue reported successfully.", "success");
    issueDescription.value = "";
    س;
    clearPendingGraphic();
    pendingPoint = null;
    updateSubmitState();
  } catch (err) {
    console.error("applyEdits failed:", err);
    showStatus("Failed to save the report. Check the layer fields.", "danger");
  } finally {
    submitReportBtn.loading = false;
  }
};

reportLocationBtn.addEventListener("click", () => {
  if (placingReport) {
    stopPlacing();
    showStatus("Placement cancelled.", "warning");
    return;
  }

  placingReport = true;
  reportLocationBtn.iconStart = "x";
  reportLocationBtn.textContent = "Click on the map… (cancel)";
  view.container.style.cursor = "crosshair";
  showStatus("Click a location on the map to set the report position.", "info");

  clickHandle = view.on("click", (event) => {
    event.stopPropagation();
    setPendingLocation(event.mapPoint);
    stopPlacing();
  });
});

issueDescription.addEventListener("calciteTextAreaInput", updateSubmitState);
issueTypeSelect.addEventListener("calciteSelectChange", updateSubmitState);

submitReportBtn.addEventListener("click", submitReport);

const reportPanel = document.getElementById("report-panel");
const closeReportBtn = document.getElementById("close-report");
const openReportBtn = document.getElementById("open-report");

const setReportPanelVisible = (visible) => {
  reportPanel.hidden = !visible;
  openReportBtn.hidden = visible;
};

closeReportBtn.addEventListener("click", () => setReportPanelVisible(false));
openReportBtn.addEventListener("click", () => setReportPanelVisible(true));

// chosen IssueType (the coded-domain value 0 / 1), or all of them.
const issueFilter = document.getElementById("issueFilter");
issueFilter.addEventListener("calciteSelectChange", () => {
  const value = issueFilter.value;
  reportingLayer.definitionExpression =
    value === "all" ? null : `IssueType = ${Number(value)}`;
});
