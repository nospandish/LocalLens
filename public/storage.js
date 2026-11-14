const STORAGE_KEY = "locallens-v1";

const sampleRestaurants = [
  {
    id: "cedar-bowl",
    name: "Cedar Bowl",
    cuisine: "Comfort bowls",
    price: "$$",
    address: "Demo address · Maple neighborhood",
    crowd: "Usually moderate",
    vibe: "Warm, calm, easy to talk",
    status: "Demo sample · not live",
    labels: ["quiet", "good for groups"],
    reasons: ["Soft lighting and booth seating", "A flexible menu for different tastes"],
    reviews: [
      "Demo review clue: people mention a relaxed room.",
      "Demo review clue: groups like the roomy tables.",
    ],
  },
  {
    id: "moonlight-tacos",
    name: "Moonlight Tacos",
    cuisine: "Tacos",
    price: "$",
    address: "Demo address · Maple neighborhood",
    crowd: "Often lively",
    vibe: "Bright, social, energetic",
    status: "Demo sample · not live",
    labels: ["good for groups", "usually crowded"],
    reasons: ["Fast counter service", "A social room that works for a group"],
    reviews: [
      "Demo review clue: people describe a busy, cheerful room.",
      "Demo review clue: the line can make it feel lively.",
    ],
  },
  {
    id: "harbor-hearth",
    name: "Harbor & Hearth",
    cuisine: "Seasonal plates",
    price: "$$$",
    address: "Demo address · Maple neighborhood",
    crowd: "Often quieter",
    vibe: "Low-key, softly lit, thoughtful",
    status: "Demo sample · not live",
    labels: ["quiet", "usually crowded"],
    reasons: ["Lower music and smaller tables", "Good choice when conversation matters"],
    reviews: [
      "Demo review clue: people mention a peaceful atmosphere.",
      "Demo review clue: dinner hours can fill up quickly.",
    ],
  },
];

function defaultState() {
  return {
    preferences: { neighborhood: "Maple neighborhood", food: "something comforting", restaurant: "", budget: "Any", groupSize: "2" },
    compareIds: [],
    restaurants: sampleRestaurants,
  };
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return {
      ...defaultState(),
      ...saved,
      restaurants: Array.isArray(saved?.restaurants) ? saved.restaurants : sampleRestaurants,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    preferences: state.preferences,
    compareIds: state.compareIds,
    restaurants: state.restaurants,
  }));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return defaultState();
}

export function getSampleRestaurants() {
  return sampleRestaurants;
}
