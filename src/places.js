const placesUrl = "https://places.googleapis.com/v1/places:searchText";
const openStreetMapUrl = "https://nominatim.openstreetmap.org/search";
const fieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.googleMapsUri",
  "places.primaryTypeDisplayName",
  "places.priceLevel",
  "places.rating",
  "places.userRatingCount",
  "places.currentOpeningHours",
  "places.businessStatus",
  "places.reviews",
].join(",");

export const friendlyPlacesError = "I couldn’t find live restaurant data right now. Add GOOGLE_PLACES_API_KEY and try again.";

function priceSymbol(level) {
  return {
    PRICE_LEVEL_FREE: "$0",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  }[level] || "Price not listed";
}

function openingStatus(hours) {
  if (hours?.openNow === true) return "Open now";
  if (hours?.openNow === false) return "Closed now";
  return "Opening status not listed";
}

function reviewText(review) {
  return typeof review?.text?.text === "string" ? review.text.text.trim() : "";
}

function labelReviewGroups(reviews) {
  const groups = [
    { label: "quiet", pattern: /quiet|calm|peaceful|relaxed|conversation|cozy|cosy/i },
    { label: "good for groups", pattern: /group|family|kids|children|friends|large table|party/i },
    { label: "usually crowded", pattern: /busy|crowd|crowded|line|wait|packed|popular/i },
  ];
  const texts = reviews.map(reviewText).filter(Boolean);
  const labeled = groups.map(({ label, pattern }) => ({
    label,
    clues: texts.filter((text) => pattern.test(text)).slice(0, 2).map((text) => text.slice(0, 180)),
  })).filter((group) => group.clues.length > 0);
  return labeled.length ? labeled : [{ label: "review clues limited", clues: ["Google Places returned reviews, but not enough matching wording for a label."] }];
}

function collection(source, fetchedAt, fields, unavailable = {}) {
  return { source, fetchedAt, fields, unavailable };
}

function mapPlace(place, fetchedAt) {
  const reviews = Array.isArray(place.reviews) ? place.reviews : [];
  const name = place.displayName?.text || "Unnamed restaurant";
  const labels = labelReviewGroups(reviews).map((group) => group.label);
  const ratingReason = place.rating ? `${place.rating}★ from ${place.userRatingCount || 0} Google ratings.` : "Google rating not listed.";
  const opening = openingStatus(place.currentOpeningHours);
  return {
    id: place.id || name,
    name,
    cuisine: place.primaryTypeDisplayName?.text || "Restaurant",
    price: priceSymbol(place.priceLevel),
    address: place.formattedAddress || "Address not listed",
    crowd: "Not provided by Google Places",
    vibe: labels.join(" · "),
    status: `Google Places · ${fetchedAt}`,
    labels,
    keywords: [place.primaryTypeDisplayName?.text || "restaurant"],
    neighborhoods: [],
    reasons: [ratingReason, opening, "Crowd level is not provided by the Google Places API."],
    reviews: reviews.map(reviewText).filter(Boolean).slice(0, 5),
    reviewGroups: labelReviewGroups(reviews),
    sourceUrl: place.googleMapsUri || "",
    sourceName: "Google Maps",
    isLive: true,
    fetchedAt,
    collection: collection(
      "Google Maps",
      fetchedAt,
      {
        name: fetchedAt,
        cuisine: fetchedAt,
        price: fetchedAt,
        address: fetchedAt,
        status: fetchedAt,
        crowd: null,
        vibe: reviews.length ? fetchedAt : null,
        reviews: reviews.length ? fetchedAt : null,
      },
      {
        crowd: "Not provided by Google Places here · no collection time",
        ...(reviews.length ? {} : { vibe: "No review-based vibe returned · no collection time", reviews: "No reviews returned · no collection time" }),
      },
    ),
  };
}

function mapOpenStreetMapPlace(place, fetchedAt) {
  const name = place.namedetails?.name || place.display_name?.split(",")[0] || "Unnamed place";
  const mapUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(place.lat)}&mlon=${encodeURIComponent(place.lon)}#map=18/${encodeURIComponent(place.lat)}/${encodeURIComponent(place.lon)}`;
  return {
    id: `osm-${place.osm_type}-${place.osm_id}`,
    name,
    cuisine: place.extratags?.cuisine || place.type || "Restaurant",
    price: "Price not listed",
    address: place.display_name || "Address not listed",
    crowd: "Not available from OpenStreetMap",
    vibe: "Reviews not available from OpenStreetMap",
    status: `OpenStreetMap · ${fetchedAt}`,
    labels: ["real place", "reviews unavailable"],
    keywords: [name, place.extratags?.cuisine || "", place.type || "restaurant"].filter(Boolean),
    neighborhoods: [],
    reasons: ["Real place name and address from OpenStreetMap.", "This no-billing source does not provide live reviews, hours, or crowd levels."],
    reviews: [],
    reviewGroups: [{ label: "reviews unavailable", clues: ["OpenStreetMap supplies place data here, not live reviews or crowd information."] }],
    sourceUrl: mapUrl,
    sourceName: "OpenStreetMap",
    isLive: true,
    fetchedAt,
    collection: collection(
      "OpenStreetMap",
      fetchedAt,
      {
        name: fetchedAt,
        cuisine: fetchedAt,
        price: null,
        address: fetchedAt,
        status: null,
        crowd: null,
        vibe: null,
        reviews: null,
      },
      {
        price: "Price not listed by OpenStreetMap · no collection time",
        status: "Opening hours not provided by OpenStreetMap · no collection time",
        crowd: "Live crowd readings are not provided by OpenStreetMap · no collection time",
        vibe: "Review-based vibe is not provided by OpenStreetMap · no collection time",
        reviews: "Reviews are not provided by OpenStreetMap · no collection time",
      },
    ),
  };
}

async function searchOpenStreetMap(body, errorMessage) {
  const neighborhood = body.neighborhood.trim();
  const food = body.food.trim();
  const restaurant = typeof body.restaurant === "string" ? body.restaurant.trim() : "";
  const query = restaurant ? `${restaurant} restaurant in ${neighborhood}` : `restaurants in ${neighborhood}`;
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    namedetails: "1",
    extratags: "1",
    limit: "6",
    "accept-language": "en",
  });
  try {
    const response = await fetch(`${openStreetMapUrl}?${params}`, {
      headers: {
        "User-Agent": "LocalLens student prototype (restaurant search)",
        Accept: "application/json",
      },
    });
    if (!response.ok) return { status: 502, body: { error: errorMessage } };
    const data = await response.json();
    const fetchedAt = new Date().toISOString();
    return {
      status: 200,
      body: {
        restaurants: data.map((place) => mapOpenStreetMapPlace(place, fetchedAt)),
        fetchedAt,
        source: "OpenStreetMap",
        crowdDataAvailable: false,
        sourceCapabilities: { placeDetails: true, reviews: false, crowd: false, openingHours: false },
      },
    };
  } catch {
    return { status: 502, body: { error: errorMessage } };
  }
}

export async function searchRestaurants(body, { apiKey, provider = "openstreetmap", errorMessage = friendlyPlacesError }) {
  const neighborhood = typeof body?.neighborhood === "string" ? body.neighborhood.trim() : "";
  const food = typeof body?.food === "string" ? body.food.trim() : "";
  const restaurant = typeof body?.restaurant === "string" ? body.restaurant.trim() : "";
  if (!neighborhood || !food) {
    return { status: 400, body: { error: "Add a neighborhood and what you want to eat first." } };
  }
  if (provider !== "google") return searchOpenStreetMap(body, errorMessage);
  if (!apiKey) return { status: 503, body: { error: errorMessage } };

  const textQuery = `${restaurant ? `${restaurant} ` : ""}${food} restaurants in ${neighborhood}`;
  try {
    const googleResponse = await fetch(placesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({ textQuery, maxResultCount: 6, languageCode: "en" }),
    });
    if (!googleResponse.ok) return { status: 502, body: { error: errorMessage } };
    const data = await googleResponse.json();
    const fetchedAt = new Date().toISOString();
    return {
      status: 200,
      body: {
        restaurants: (data.places || []).map((place) => mapPlace(place, fetchedAt)),
        fetchedAt,
        source: "Google Places",
        crowdDataAvailable: false,
        sourceCapabilities: { placeDetails: true, reviews: true, crowd: false, openingHours: true },
      },
    };
  } catch {
    return { status: 502, body: { error: errorMessage } };
  }
}
