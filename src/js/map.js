function goHome() {
    window.location.href = '../../index.html';
}

const map = L.map('map').setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let pinnedMarker;
let amenityMarkers = [];
const geocodeAPI = 'https://nominatim.openstreetmap.org/search';

function searchCity() {
    const cityName = document.getElementById('search-input').value;
    if (!cityName) {
        alert('Please enter a city name.');
        return;
    }

    fetch(`${geocodeAPI}?q=${encodeURIComponent(cityName)}&format=json`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                alert('City not found. Please try another name.');
                return;
            }
            const { lat, lon } = data[0];
            map.setView([lat, lon], 14);
            if (pinnedMarker) {
                map.removeLayer(pinnedMarker);
            }
            pinnedMarker = L.marker([lat, lon]).addTo(map).bindPopup(`City: ${cityName}`).openPopup();
        })
        .catch(error => {
            console.error('Error fetching city data:', error);
            alert('Failed to fetch city information. Please try again later.');
        });
}

map.on('click', function (e) {
    const { lat, lng } = e.latlng;
    if (pinnedMarker) {
        map.removeLayer(pinnedMarker);
    }
    amenityMarkers.forEach(marker => map.removeLayer(marker));
    amenityMarkers = [];
    pinnedMarker = L.marker([lat, lng]).addTo(map).bindPopup('Pinned Location').openPopup();
    fetchNearbyAmenities(lat, lng);
});

function fetchNearbyAmenities(lat, lng) {
    const query = `
        [out:json];
        (
            node["highway"="bus_stop"](around:5000,${lat},${lng});
            node["public_transport"="platform"](around:5000,${lat},${lng});
            node["railway"="station"](around:5000,${lat},${lng});
            node["aeroway"="aerodrome"](around:5000,${lat},${lng});
            node["amenity"="hospital"](around:5000,${lat},${lng});
            node["amenity"="fire_station"](around:5000,${lat},${lng});
            node["amenity"="police"](around:5000,${lat},${lng});
            node["shop"="supermarket"](around:5000,${lat},${lng});
        );
        out body;
    `;

    fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query))
        .then(response => response.json())
        .then(data => displayAmenities(data.elements || [], lat, lng))
        .catch(error => {
            console.error('Error fetching amenities:', error);
            document.getElementById('amenity-list').innerHTML = '<p>Error fetching amenities. Please try again later.</p>';
        });
}

const emojiIcons = {
    bus_stop: '🚌',
    platform: '🚏',
    railway: '🚆',
    aerodrome: '✈️',
    hospital: '🏥',
    fire_station: '🚒',
    police: '🚓',
    supermarket: '🛒',
    default: '📍'
};

function displayAmenities(amenities, lat, lng) {
    const amenityListDiv = document.getElementById('amenity-list');
    amenityListDiv.innerHTML = '<h2>Nearby Amenities</h2>';
    if (amenities.length === 0) {
        amenityListDiv.innerHTML += '<p>No amenities found nearby.</p>';
        return;
    }
    const ul = document.createElement('ul');
    amenities.forEach(amenity => {
        const name = amenity.tags.name || 'Unnamed';
        const type = amenity.tags.amenity || amenity.tags.highway || amenity.tags.shop || 'Unknown';
        const emoji = emojiIcons[type] || emojiIcons.default;
        const marker = L.marker([amenity.lat, amenity.lon]).addTo(map);
        marker.bindPopup(`${emoji} <b>${name}</b><br>Type: ${type}`).openPopup();
        amenityMarkers.push(marker);
        const li = document.createElement('li');
        li.innerHTML = `${emoji} ${name} (${type})`;
        ul.appendChild(li);
    });
    amenityListDiv.appendChild(ul);
}
