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
  compareSection: document.querySelector("#compareSection"),
  compareGrid: document.querySelector("#compareGrid"),
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
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

function findNamedRestaurant(name) {
  const normalized = name.trim().toLowerCase();
  return state.restaurants.find((restaurant) => restaurant.name.toLowerCase() === normalized)
    || state.restaurants.find((restaurant) => restaurant.name.toLowerCase().includes(normalized));
}

function renderDemoRestaurantSummary(restaurant) {
  renderSummary(`${restaurant.name} is ${restaurant.crowd.toLowerCase()} with a ${restaurant.vibe.toLowerCase()} vibe. It is labeled ${restaurant.labels.join(" and ")}. This is made-up demo data, not a live crowd reading. ${restaurant.reasons[0]}.`);
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
      <div>${restaurant.labels.map((label) => `<span class="vibe-label">${escapeHtml(label)}</span> `).join("")}</div>
      <h4>Vibe</h4>
      <p>${escapeHtml(restaurant.vibe)}</p>
      <h4>Why it may fit</h4>
      <ul class="reason-list">${restaurant.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      <h4>Review clues, sorted</h4>
      <ul class="review-list">${restaurant.reviews.map((review) => `<li>${escapeHtml(review)}</li>`).join("")}</ul>
      <label class="compare-toggle"><input type="checkbox" data-compare-id="${escapeHtml(restaurant.id)}" ${checked}> Compare this place</label>
    </article>`;
}

function renderCards() {
  elements.results.innerHTML = state.restaurants.map((restaurant) => cardMarkup(restaurant, state.compareIds)).join("");
}

function renderCompare() {
  const selected = state.restaurants.filter((restaurant) => state.compareIds.includes(restaurant.id));
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
      <span class="info-chip">Demo data · not live</span>
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

async function askAi(preferences) {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...preferences, restaurants: getSampleRestaurants() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The AI could not answer right now.");
  return data.answer;
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const preferences = readPreferences();
  if (!preferences.neighborhood || !preferences.food || !preferences.restaurant) {
    elements.formMessage.textContent = "Add a neighborhood, what you want to eat, and a restaurant name first.";
    return;
  }

  state.preferences = preferences;
  saveState(state);
  const namedRestaurant = findNamedRestaurant(preferences.restaurant);
  elements.button.disabled = true;
  elements.button.querySelector("span").textContent = "Thinking…";
  elements.formMessage.textContent = "LocalLens is asking the AI once for this request.";
  renderSummary("Thinking…");

  try {
    const answer = await askAi(preferences);
    renderSummary(answer);
    elements.formMessage.textContent = "Answer ready. Demo restaurant clues below are clearly labeled and not live.";
  } catch (error) {
    if (namedRestaurant) {
      renderDemoRestaurantSummary(namedRestaurant);
      elements.formMessage.textContent = "The named demo summary is ready. Add the local OpenAI key to also get the AI explanation.";
    } else {
      renderSummary(error.message, true);
      elements.formMessage.textContent = "Try one of the named demo places below, or add the local OpenAI key.";
    }
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
renderCards();
renderCompare();

// Keep a tiny reset hook handy for a student demo without adding another UI control.
window.resetLocalLensDemo = () => {
  state = resetState();
  setFormFromState();
  renderCards();
  renderCompare();
  renderSummary("Tell LocalLens your neighborhood and craving to get a short, careful recommendation.");
};
