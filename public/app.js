import { getSampleRestaurants, loadState, resetState, saveState } from "/storage.js";

let state = loadState();

const elements = {
  form: document.querySelector("#spotForm"),
  neighborhood: document.querySelector("#neighborhood"),
  food: document.querySelector("#food"),
  restaurant: document.querySelector("#restaurant"),
  budget: document.querySelector("#budget"),
  groupSize: document.querySelector("#groupSize"),
  button: document.querySelector("#findButton"),
  formMessage: document.querySelector("#formMessage"),
  summary: document.querySelector("#aiSummary"),
  results: document.querySelector("#resultsGrid"),
  matchMessage: document.querySelector("#matchMessage"),
  dataLabel: document.querySelector("#dataLabel"),
  compareSection: document.querySelector("#compareSection"),
  compareGrid: document.querySelector("#compareGrid"),
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

const collectionFieldLabels = [
  ["name", "Name"],
  ["address", "Address"],
  ["cuisine", "Cuisine"],
  ["price", "Price"],
  ["status", "Opening status"],
  ["crowd", "Crowd"],
  ["vibe", "Vibe"],
  ["reviews", "Review clues"],
];

function collectionValue(restaurant, field) {
  const fields = restaurant.collection?.fields;
  const hasField = fields && Object.prototype.hasOwnProperty.call(fields, field);
  const timestamp = hasField ? fields[field] : (restaurant.isLive ? restaurant.fetchedAt : null);
  const source = restaurant.collection?.source || restaurant.sourceName || "live source";
  const unavailable = restaurant.collection?.unavailable?.[field];
  if (unavailable) return unavailable;
  if (!timestamp) return restaurant.isLive ? `Not available from ${source}` : "Demo data · not collected live";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return `Collected from ${source}`;
  return `Collected ${date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
}

function collectionMarkup(restaurant) {
  const source = restaurant.collection?.source || restaurant.sourceName || "Demo sample";
  return `
    <details class="collection-details">
      <summary>When was this info collected?</summary>
      <p class="collection-source">Source: ${escapeHtml(source)}</p>
      <dl class="collection-list">${collectionFieldLabels.map(([field, label]) => `
        <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(collectionValue(restaurant, field))}</dd></div>`).join("")}</dl>
    </details>`;
}

function googleMapsSearchUrl(restaurant) {
  const query = encodeURIComponent(`${restaurant.name}, ${restaurant.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function setFormFromState() {
  const { neighborhood, food, restaurant, budget, groupSize } = state.preferences;
  elements.neighborhood.value = neighborhood;
  elements.food.value = food;
  elements.restaurant.value = restaurant;
  elements.budget.value = budget;
  elements.groupSize.value = groupSize;
}

function renderSummary(text, isError = false) {
  elements.summary.classList.toggle("has-error", isError);
  elements.summary.innerHTML = `
    <div class="summary-icon">${isError ? "!" : "✦"}</div>
    <div>
      <p class="summary-kicker">${isError ? "Friendly heads-up" : "AI guide"}</p>
      <p class="summary-text">${escapeHtml(text)}</p>
    </div>`;
}

function getErrorMessage(data, fallback) {
  if (typeof data?.error === "string") return data.error;
  if (data?.error?.message) return data.error.message;
  return fallback;
}

function findNamedRestaurant(name) {
  const normalized = name.trim().toLowerCase();
  return state.restaurants.find((restaurant) => restaurant.name.toLowerCase() === normalized)
    || state.restaurants.find((restaurant) => restaurant.name.toLowerCase().includes(normalized));
}

function renderDemoRestaurantSummary(restaurant) {
  renderSummary(`${restaurant.name} is ${restaurant.crowd.toLowerCase()} with a ${restaurant.vibe.toLowerCase()} vibe. It is labeled ${restaurant.labels.join(" and ")}. This is made-up demo data, not a live crowd reading. ${restaurant.reasons[0]}.`);
}

function words(value) {
  return String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 1);
}

function rankRestaurants(preferences) {
  const foodWords = words(preferences.food);
  const neighborhoodWords = words(preferences.neighborhood);
  const requestedName = preferences.restaurant.toLowerCase();
  const requestedFood = preferences.food.toLowerCase();

  return [...state.restaurants].map((restaurant, index) => {
    const searchable = [restaurant.name, restaurant.cuisine, restaurant.vibe, ...(restaurant.keywords || [])].join(" ").toLowerCase();
    let score = 0;
    score += foodWords.reduce((total, word) => total + (searchable.includes(word) ? 3 : 0), 0);
    score += neighborhoodWords.reduce((total, word) => total + ((restaurant.neighborhoods || []).some((place) => place.includes(word)) ? 2 : 0), 0);
    if (preferences.budget !== "Any" && restaurant.price === preferences.budget) score += 4;
    if ((preferences.groupSize === "5+" || preferences.groupSize === "3–4") && restaurant.labels.includes("good for groups")) score += 4;
    if (/quiet|calm|conversation/i.test(requestedFood) && restaurant.labels.includes("quiet")) score += 5;
    if (requestedName && restaurant.name.toLowerCase().includes(requestedName)) score += 20;
    return { restaurant, score, index };
  }).sort((left, right) => right.score - left.score || left.index - right.index).map(({ restaurant }) => restaurant);
}

function renderMatchMessage(preferences, isLive = false, fetchedAt = "", source = "OpenStreetMap", sourceCapabilities = {}) {
  const restaurantPart = preferences.restaurant ? ` for “${preferences.restaurant}”` : "";
  const limits = [
    sourceCapabilities.crowd === false ? "live crowd readings" : "",
    sourceCapabilities.reviews === false ? "reviews" : "",
    sourceCapabilities.openingHours === false ? "opening hours" : "",
  ].filter(Boolean);
  const limitation = limits.length
    ? ` ${source} does not provide ${limits.join(", ").replace(/, ([^,]*)$/, " or $1")} for this search.`
    : "";
  elements.dataLabel.textContent = isLive ? `Live ${source}` : "Made-up sample data";
  elements.matchMessage.textContent = isLive
    ? `Live ${source} results for ${preferences.neighborhood} · ${preferences.food}${restaurantPart}.${limitation}${fetchedAt ? ` Place details fetched ${new Date(fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` : ""}`
    : `Demo matches for ${preferences.neighborhood} · ${preferences.food}${restaurantPart} · budget ${preferences.budget} · group size ${preferences.groupSize}.`;
}

function cardMarkup(restaurant, compareIds) {
  const checked = compareIds.includes(restaurant.id) ? "checked" : "";
  return `
    <article class="restaurant-card">
      <div class="restaurant-top">
        <div>
          <h3>${escapeHtml(restaurant.name)}</h3>
          <p class="restaurant-meta">${escapeHtml(restaurant.cuisine)} · ${escapeHtml(restaurant.price)}<br>${escapeHtml(restaurant.address)}</p>
        </div>
        <span class="card-status">${escapeHtml(restaurant.status)}</span>
      </div>
      <div class="crowd-row"><span class="info-chip">Crowd: ${escapeHtml(restaurant.crowd)}</span></div>
      ${collectionMarkup(restaurant)}
      <div>${restaurant.labels.map((label) => `<span class="vibe-label">${escapeHtml(label)}</span> `).join("")}</div>
      <h4>Vibe</h4>
      <p>${escapeHtml(restaurant.vibe)}</p>
      <h4>Why it may fit</h4>
      <ul class="reason-list">${restaurant.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      <h4>Evidence for each label</h4>
      <div class="review-groups">${restaurant.reviewGroups.map((group) => `
        <section class="review-group">
          <span class="review-group-label">${escapeHtml(group.label)}</span>
          <p class="evidence-caption">Evidence used for this label:</p>
          <ul class="review-list">${group.clues.map((clue) => `<li>${escapeHtml(clue)}</li>`).join("")}</ul>
        </section>`).join("")}</div>
      ${restaurant.sourceUrl ? `<a class="source-link" href="${escapeHtml(restaurant.sourceUrl)}" target="_blank" rel="noreferrer">View on ${escapeHtml(restaurant.sourceName || "source map")} ↗</a>` : ""}
      ${restaurant.isLive ? `<a class="source-link live-check-link" href="${escapeHtml(googleMapsSearchUrl(restaurant))}" target="_blank" rel="noreferrer">Check live crowd, reviews & hours in Google Maps ↗</a>` : ""}
      <label class="compare-toggle"><input type="checkbox" data-compare-id="${escapeHtml(restaurant.id)}" ${checked}> Compare this place</label>
    </article>`;
}

function renderCards(restaurants = rankRestaurants(state.preferences)) {
  elements.results.innerHTML = restaurants.map((restaurant) => cardMarkup(restaurant, state.compareIds)).join("");
}

function renderCompare(restaurants = rankRestaurants(state.preferences)) {
  const selected = restaurants.filter((restaurant) => state.compareIds.includes(restaurant.id));
  if (selected.length < 2) {
    elements.compareSection.hidden = true;
    return;
  }
  elements.compareSection.hidden = false;
  elements.compareGrid.innerHTML = selected.slice(0, 2).map((restaurant) => `
    <article class="compare-card">
      <p class="eyebrow">${escapeHtml(restaurant.cuisine)} · ${escapeHtml(restaurant.price)}</p>
      <h3>${escapeHtml(restaurant.name)}</h3>
      <p><strong>Vibe:</strong> ${escapeHtml(restaurant.vibe)}</p>
      <p><strong>Crowd clue:</strong> ${escapeHtml(restaurant.crowd)}</p>
      <p><strong>Best for:</strong> ${escapeHtml(restaurant.labels.join(" · "))}</p>
      <span class="info-chip">${selected[0]?.isLive ? `${escapeHtml(selected[0].sourceName || "Live source")} data · crowd not provided` : "Demo data · not live"}</span>
    </article>`).join("");
}

function readPreferences() {
  return {
    neighborhood: elements.neighborhood.value.trim(),
    food: elements.food.value.trim(),
    restaurant: elements.restaurant.value.trim(),
    budget: elements.budget.value,
    groupSize: elements.groupSize.value,
  };
}

async function askAi(preferences, restaurants, source = "Demo sample data", fetchedAt = "") {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...preferences, restaurants, source, fetchedAt }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getErrorMessage(data, "The AI could not answer right now."));
  return data.answer;
}

async function fetchLiveRestaurants(preferences) {
  const response = await fetch("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getErrorMessage(data, "Live restaurant data is unavailable right now."));
  if (!Array.isArray(data.restaurants) || data.restaurants.length === 0) {
    throw new Error("Google Places did not find restaurants for that search.");
  }
  return data;
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const preferences = readPreferences();
  if (!preferences.neighborhood || !preferences.food) {
    elements.formMessage.textContent = "Add a neighborhood and what you want to eat first.";
    return;
  }

  state.preferences = preferences;
  saveState(state);
  elements.button.disabled = true;
  elements.button.querySelector("span").textContent = "Finding…";
  elements.formMessage.textContent = "Finding real restaurants from Google Places…";
  renderSummary("Finding real places…");

  try {
    const liveData = await fetchLiveRestaurants(preferences);
    state.restaurants = liveData.restaurants;
    state.compareIds = [];
    saveState(state);
    renderMatchMessage(preferences, true, liveData.fetchedAt, liveData.source, liveData.sourceCapabilities);
    renderCards(state.restaurants);
    renderCompare(state.restaurants);
    elements.formMessage.textContent = "Live restaurant data is ready. Asking the AI for one careful explanation…";
    try {
      const answer = await askAi(preferences, state.restaurants, liveData.source, liveData.fetchedAt);
      renderSummary(answer);
      elements.formMessage.textContent = "Live places and AI explanation are ready. Crowd level is not provided by Google Places.";
    } catch (error) {
      renderSummary(`Live places loaded, but the AI explanation is unavailable. ${error.message}`, true);
      elements.formMessage.textContent = "The live restaurant cards are ready; check the OpenAI key for the AI explanation.";
    }
  } catch (error) {
    state.restaurants = getSampleRestaurants();
    state.compareIds = [];
    saveState(state);
    renderMatchMessage(preferences);
    renderCards();
    renderCompare();
    renderSummary(error.message, true);
    elements.formMessage.textContent = "Showing made-up samples while live restaurant data is unavailable.";
  } finally {
    elements.button.disabled = false;
    elements.button.querySelector("span").textContent = "Find my spot";
  }
});

elements.results.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-compare-id]");
  if (!checkbox) return;
  const id = checkbox.dataset.compareId;
  if (checkbox.checked) {
    if (state.compareIds.length < 2) state.compareIds.push(id);
    else checkbox.checked = false;
  } else {
    state.compareIds = state.compareIds.filter((compareId) => compareId !== id);
  }
  saveState(state);
  renderCards();
  renderCompare();
});

setFormFromState();
renderMatchMessage(state.preferences);
renderCards();
renderCompare();

// Keep a tiny reset hook handy for a student demo without adding another UI control.
window.resetLocalLensDemo = () => {
  state = resetState();
  setFormFromState();
  renderMatchMessage(state.preferences);
  renderCards();
  renderCompare();
  renderSummary("Tell LocalLens your neighborhood and craving to get a short, careful recommendation.");
};
