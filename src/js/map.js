const map = L.map("map").setView([20.5937, 78.9629], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let pinnedMarker;
let userMarker;
let amenityMarkers = [];
let allAmenities = [];
let currentCategory = "all";
const geocodeAPI = "https://nominatim.openstreetmap.org/search";

const emojiIcons = {
  hospital: "🏥",
  police: "🚓",
  fire_station: "🚒",
  supermarket: "🛒",
  pharmacy: "💊",
  cafe: "☕",
  restaurant: "🍽️",
  post_box:"📮",
  parking_entrance:"🅿️",
  bus_station:"🚏",
  theatre:"🎥",
  place_of_worship:"🛐",
  atm:"🏧",
  doctors:"🧑‍⚕️",
  clinic:"🏨",
  bank: "🏦",
  library: "📚",
  school: "🏫",
  university: "🎓",
  bus_stop: "🚌",
  fuel:"⛽",
  railway_station: "🚉",
  subway_entrance: "🚇",
  airport: "✈️",
  airline: "🛫",
  airway: "🛬",
  aeroway:"🛬",
  aerodrome:"🛫",
  aerohub:"🛫",
  default: "📍",
};

function trackCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 14);

        if (userMarker) map.removeLayer(userMarker);

        const userIcon = L.divIcon({
          className: "custom-marker",
          html: '<div style="font-size: 24px;">📍</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        userMarker = L.marker([latitude, longitude], { icon: userIcon })
          .addTo(map)
          .bindPopup("📍 Your Current Location")
          .openPopup();

        fetchNearbyAmenities(latitude, longitude);
      },
      () => alert("Unable to retrieve your location.")
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

trackCurrentLocation();

function searchCity() {
  const cityName = document.getElementById("search-input").value.trim();
  if (!cityName) return alert("Please enter a city name.");

  document.getElementById("loading").style.display = "flex";

  fetch(`${geocodeAPI}?q=${encodeURIComponent(cityName)}&format=json`)
    .then((response) => response.json())
    .then((data) => {
      if (!data.length) return alert("City not found.");

      const { lat, lon } = data[0];
      map.setView([lat, lon], 14);

      if (pinnedMarker) map.removeLayer(pinnedMarker);

      pinnedMarker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`📍 City: ${cityName}`)
        .openPopup();

      fetchNearbyAmenities(lat, lon);
    })
    .catch((error) => {
      console.error("Error fetching city data:", error);
      alert("Something went wrong. Try again.");
    })
    .finally(() => {
      document.getElementById("loading").style.display = "none";
    });
}

document.getElementById("search-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    searchCity();
  }
});

map.on("click", function (e) {
  const { lat, lng } = e.latlng;
  if (pinnedMarker) map.removeLayer(pinnedMarker);
  amenityMarkers.forEach((marker) => map.removeLayer(marker));
  amenityMarkers = [];
  pinnedMarker = L.marker([lat, lng])
    .addTo(map)
    .bindPopup("📍 Pinned Location")
    .openPopup();
  fetchNearbyAmenities(lat, lng);
});

function fetchNearbyAmenities(lat, lng) {
  document.getElementById("loading").style.display = "flex";

  const query = `
    [out:json];
    (
      node(around:5000,${lat},${lng})[amenity];
      node(around:5000,${lat},${lng})[railway=station];
      node(around:5000,${lat},${lng})[railway=subway_entrance];
      node(around:5000,${lat},${lng})[aeroway=aerodrome];
      node(around:5000,${lat},${lng})[aeroway=airline];
      node(around:5000,${lat},${lng})[aeroway=airway];
    );
    out body;
  `;

  fetch("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query))
    .then((response) => response.json())
    .then((data) => displayAmenities(data.elements || [], lat, lng))
    .catch((error) => console.error("Error fetching amenities:", error))
    .finally(() => {
      document.getElementById("loading").style.display = "none";
    });
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function categorizeAmenity(tags) {
  if (tags.amenity) return tags.amenity;
  if (tags.railway === "station") return "railway_station";
  if (tags.railway === "subway_entrance") return "subway_entrance";
  if (tags.aeroway === "aerodrome") return "airport";
  if (tags.aeroway === "airline") return "airline";
  if (tags.aeroway === "airway") return "airway";
  if (tags.airport === "airway") return "airway";
  return "default";
}

function displayAmenities(amenities, lat, lng) {
  const list = document.getElementById("amenity-list");
  list.innerHTML = "";
  allAmenities = amenities;

  if (!amenities.length) {
    list.innerHTML = "<h2>No amenities found.</h2>";
    return;
  }

  const categorySelect = document.getElementById("category-select");
  categorySelect.innerHTML = '<option value="all">All Categories</option>';

  const categorizedAmenities = {};
  amenities.forEach((amenity) => {
    const type = categorizeAmenity(amenity.tags);
    if (!categorizedAmenities[type]) {
      categorizedAmenities[type] = [];
      const option = document.createElement("option");
      option.value = type;
      option.textContent = `${emojiIcons[type] || emojiIcons.default} ${type.replace("_", " ").toUpperCase()}`;
      categorySelect.appendChild(option);
    }
    amenity.distance = getDistance(lat, lng, amenity.lat, amenity.lon);
    categorizedAmenities[type].push(amenity);
  });

  filterAmenities();
}

function filterAmenities() {
  const list = document.getElementById("amenity-list");
  const categorySelect = document.getElementById("category-select");
  currentCategory = categorySelect.value;

  amenityMarkers.forEach((marker) => map.removeLayer(marker));
  amenityMarkers = [];
  list.innerHTML = "";

  if (!allAmenities.length) {
    list.innerHTML = "<h2>No amenities found.</h2>";
    return;
  }

  const categorizedAmenities = {};
  allAmenities.forEach((amenity) => {
    const type = categorizeAmenity(amenity.tags);
    if (!categorizedAmenities[type]) categorizedAmenities[type] = [];
    categorizedAmenities[type].push(amenity);
  });

  const categoriesToShow =
    currentCategory === "all"
      ? Object.keys(categorizedAmenities)
      : [currentCategory];

  let totalAmenities = 0;
  categoriesToShow.forEach((category) => {
    totalAmenities += categorizedAmenities[category].length;
  });

  list.innerHTML = `<h2>Total Amenities Found: ${totalAmenities}</h2>`;

  categoriesToShow.forEach((category) => {
    const emoji = emojiIcons[category] || emojiIcons.default;
    const amenities = categorizedAmenities[category];

    const heading = document.createElement("h3");
    heading.textContent = `${emoji} ${category.replace("_", " ").toUpperCase()} (${amenities.length})`;
    list.appendChild(heading);

    const ul = document.createElement("ul");
    amenities.forEach((amenity) => {
      const name = amenity.tags.name || "Unnamed";

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="font-size: 24px;">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      const marker = L.marker([amenity.lat, amenity.lon], { icon }).addTo(map);
      marker.bindPopup(
        `${emoji} <b>${name}</b><br>Type: ${category}<br>Distance: ${amenity.distance.toFixed(2)} km`
      );
      amenityMarkers.push(marker);

      const li = document.createElement("li");
      li.innerHTML = `${emoji} ${name} (${category}) - ${amenity.distance.toFixed(2)} km`;
      ul.appendChild(li);
    });
    list.appendChild(ul);
  });
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("collapsed");
  document.querySelector(".toggle-sidebar").textContent =
    sidebar.classList.contains("collapsed") ? "📌" : "📌 Toggle List";
}
