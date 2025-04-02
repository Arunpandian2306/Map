function goHome() {
    window.location.href = '../../index.html';
}

const map = L.map('map').setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let pinnedMarker;
let userMarker;
let amenityMarkers = [];
const geocodeAPI = 'https://nominatim.openstreetmap.org/search';

const emojiIcons = {
    hospital: '🏥',
    police: '🚓',
    fire_station: '🚒',
    supermarket: '🛒',
    pharmacy: '💊',
    cafe: '☕',
    restaurant: '🍽️',
    bank: '🏦',
    library: '📚',
    school: '🏫',
    university: '🎓',
    bus_stop: '🚌',
    railway: '🚆',
    default: '📍'
};

// Get user's current location
function trackCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 14);
            
            if (userMarker) {
                map.removeLayer(userMarker);
            }

            const userIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="font-size: 24px; text-align: center;">📍</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });

            userMarker = L.marker([latitude, longitude], { icon: userIcon })
                .addTo(map)
                .bindPopup('📍 Your Current Location')
                .openPopup();

            fetchNearbyAmenities(latitude, longitude);
        }, () => {
            alert('Unable to retrieve your location.');
        });
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Call the function to get the user's current location
trackCurrentLocation();

function searchCity() {
    const cityName = document.getElementById('search-input').value;
    if (!cityName) {
        alert('Please enter a city name.');
        return;
    }
    document.getElementById("loading").style.display = "flex";

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
            pinnedMarker = L.marker([lat, lon]).addTo(map).bindPopup(`📍 City: ${cityName}`).openPopup();
        })
        .finally(() => {
            document.getElementById("loading").style.display = "none";
        })
        .catch(error => console.error('Error fetching city data:', error));
}

map.on('click', function (e) {
    const { lat, lng } = e.latlng;
    if (pinnedMarker) {
        map.removeLayer(pinnedMarker);
    }
    amenityMarkers.forEach(marker => map.removeLayer(marker));
    amenityMarkers = [];
    pinnedMarker = L.marker([lat, lng]).addTo(map).bindPopup('📍 Pinned Location').openPopup();
    fetchNearbyAmenities(lat, lng);
});

function fetchNearbyAmenities(lat, lng) {
    document.getElementById("loading").style.display = "flex";
    const query = `[out:json];(node["amenity"](around:5000,${lat},${lng}););out body;`;

    fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query))
        .then(response => response.json())
        .then(data => displayAmenities(data.elements || [], lat, lng))
        .finally(() => {
            document.getElementById("loading").style.display = "none";
        })
        .catch(error => console.error('Error fetching amenities:', error));
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function displayAmenities(amenities, lat, lng) {
    const list = document.getElementById('amenity-list');
    list.innerHTML = '';
    if (amenities.length === 0) {
        list.innerHTML = '<h2>No amenities found.</h2>';
        return;
    }
    
    const categorizedAmenities = {};
    amenities.forEach(amenity => {
        const type = amenity.tags.amenity || 'default';
        if (!categorizedAmenities[type]) {
            categorizedAmenities[type] = [];
        }
        amenity.distance = getDistance(lat, lng, amenity.lat, amenity.lon);
        categorizedAmenities[type].push(amenity);
    });

    let totalAmenities = amenities.length;
    list.innerHTML = `<h2>Total Amenities Found: ${totalAmenities}</h2>`;
    
    Object.keys(categorizedAmenities).forEach(category => {
        categorizedAmenities[category].sort((a, b) => a.distance - b.distance);
    });

    Object.entries(categorizedAmenities).forEach(([type, amenities]) => {
        const emoji = emojiIcons[type] || emojiIcons.default;
        const categoryHeading = document.createElement('h3');
        categoryHeading.textContent = `${emoji} ${type.replace('_', ' ').toUpperCase()} (${amenities.length})`;
        list.appendChild(categoryHeading);

        const ul = document.createElement('ul');
        amenities.forEach(amenity => {
            const name = amenity.tags.name || 'Unnamed';

            // Create a custom marker with an emoji
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="font-size: 24px; text-align: center;">${emoji}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });

            const marker = L.marker([amenity.lat, amenity.lon], { icon: customIcon }).addTo(map);
            marker.bindPopup(`${emoji} <b>${name}</b><br>Type: ${type}<br>Distance: ${amenity.distance.toFixed(2)} km`);
            amenityMarkers.push(marker);

            const li = document.createElement('li');
            li.innerHTML = `${emoji} ${name} (${type}) - ${amenity.distance.toFixed(2)} km`;
            ul.appendChild(li);
        });
        list.appendChild(ul);
    });
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('hidden');
}
