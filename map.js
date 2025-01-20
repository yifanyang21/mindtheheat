const map = L.map('map', {
    zoomControl: false,
    attributionControl: true
}).setView([0, 0], 13);

let lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});
let darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

lightTileLayer.addTo(map);

L.control.zoom({
    position: 'topleft'
}).addTo(map);

let neighborhoodLayer = null;
let streetLayer = null;
let clusterLayer = null;

let neighborhoodData = null;
let streetNetworkData = null;
let clusterData = null;
let allStreetsData = null;

async function loadGeoJson(url) {
    const response = await fetch(url);
    return response.json();
}

async function searchAndZoom(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([lat, lon], 16);
        } else {
            alert('No matching results found.');
        }
    } catch (error) {
        console.error('Error fetching search results:', error);
        alert('Error fetching search results.');
    }
}

function filterStreetsByNeighborhood(neighborhood, data) {
    return turf.featureCollection(
        data.features.filter(street => {
            return turf.booleanPointInPolygon(
                turf.center(street),
                neighborhood
            );
        })
    );
}

function getStreetColor(score) {
    if (score === null) return '#ddd';
    if (score >= 0.75) return '#FF6200';
    if (score >= 0.5) return '#FFA200';
    if (score > 0) return '#FFC300';
    return '#F1DDA0';
}

function getStreetWeight_neighbor(jenkins_bin) {
    if (jenkins_bin === "bin_4") return 7;
    if (jenkins_bin === "bin_3") return 5;
    if (jenkins_bin === "bin_2") return 4;
    return 2;
}

function getStreetWeight_city(jenkins_bin) {
    if (jenkins_bin === "bin_4") return 3;
    if (jenkins_bin === "bin_3") return 2;
    if (jenkins_bin === "bin_2") return 1;
    return 1;
}

function getBlack() {
    return document.body.classList.contains('dark-mode') ? 'white' : 'black';
}
function getWhite() {
    return document.body.classList.contains('light-mode') ? 'white' : 'black';
}

function createLegendSection(titleText, gradientClass, labels, isFlow = false) {
    const section = document.createElement('div');
    section.className = 'legend-section';

    const title = document.createElement('div');
    title.className = 'legend-title';
    title.textContent = titleText;

    const content = document.createElement('div');
    content.className = 'legend-content';

    const gradient = document.createElement('div');
    gradient.className = gradientClass;

    const textContainer = document.createElement('div');
    textContainer.className = 'legend-text-container';

    labels.forEach(label => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        if (isFlow) {
            const legendLine = document.createElement('div');
            legendLine.className = `legend-line ${label.className}`;
            const legendText = document.createElement('span');
            legendText.textContent = label.text;
            legendItem.appendChild(legendLine);
            legendItem.appendChild(legendText);
        } else {
            const legendText = document.createElement('span');
            legendText.textContent = label;
            legendItem.appendChild(legendText);
        }
        textContainer.appendChild(legendItem);
    });

    content.appendChild(gradient);
    content.appendChild(textContainer);
    section.appendChild(title);
    section.appendChild(content);

    return section;
}


function resetNeighborhoodStyles() {
    neighborhoodLayer.eachLayer(function (layer) {
        neighborhoodLayer.resetStyle(layer);
        layer.unbindTooltip();
    });
}

let currentShadeThreshold = 0;
let currentPetThreshold = 0.0;
let buurtData = null;

document.getElementById('shade-slider').addEventListener('input', function () {
    currentShadeThreshold = parseFloat(this.value);
    document.getElementById('shade-slider-value').textContent = 100 - currentShadeThreshold;
    applyFilter();
});

document.getElementById('pet-slider').addEventListener('input', function () {
    currentPetThreshold = parseFloat(this.value);
    document.getElementById('pet-slider-value').textContent = currentPetThreshold;
    applyFilter();
});

function applyFilter() {
    if (streetLayer) {
        map.removeLayer(streetLayer);
    }

    const neighborhoodIndex = document.getElementById('neighborhood-select').value;
    const dataToFilter = neighborhoodIndex === 'all' ? allStreetsData : buurtData;

    if (!dataToFilter) return;

    const filteredData = {
        ...dataToFilter,
        features: dataToFilter.features.filter(feature => {
            return feature.properties.avg_exposure_percent * 100 >= currentShadeThreshold &&
                feature.properties.PET >= currentPetThreshold;
        })
    };

    if (neighborhoodIndex === 'all') {
        streetLayer = L.geoJSON(filteredData, {
            style: function (feature) {
                return {
                    color: getStreetColor(feature.properties.Final_score_all),
                    weight: getStreetWeight_city(feature.properties.jenkins_bin)
                };
            }
        }).addTo(map);
    } else {
        streetLayer = L.geoJSON(filteredData, {
            style: function (feature) {
                return {
                    color: getStreetColor(feature.properties.Final_score_all),
                    weight: getStreetWeight_neighbor(feature.properties.jenkins_bin)
                };
            }
        }).addTo(map);
    }

    applyStreetInteractions();
}

async function updateMap(neighborhoodIndex) {
    const clusterCheckbox = document.getElementById('cluster-checkbox');
    if (clusterCheckbox.checked && clusterData) {
        if (clusterLayer) {
            map.removeLayer(clusterLayer);
        }
        clusterLayer = L.geoJSON(clusterData, {
            style: { color: 'lightorange', weight: 1, fillOpacity: 0.3 }
        }).addTo(map);
    } else if (clusterLayer) {
        map.removeLayer(clusterLayer);
    }

    resetNeighborhoodStyles();
    if (streetLayer) {
        map.removeLayer(streetLayer);
    }

    if (neighborhoodIndex === 'all') {
        buurtData = null;
        applyFilter();
        map.fitBounds(streetLayer.getBounds());
    } else {
        const selectedNeighborhood = neighborhoodData.features[neighborhoodIndex];
        const buurtCode = selectedNeighborhood.properties.Buurtcode;
        buurtData = await loadGeoJson(`data/Buurt_data/${buurtCode}.geojson`);
        applyFilter();

        const bounds = L.geoJSON(selectedNeighborhood).getBounds();
        map.fitBounds(bounds);

        neighborhoodLayer.eachLayer(function (layer) {
            if (layer.feature === selectedNeighborhood) {
                layer.off('mouseover');
                layer.off('mouseout');
                layer.setStyle({ weight: 3, color: getBlack() });
                layer.unbindTooltip();
            }
        });
    }

    applyStreetInteractions();
}

function switchToDarkMode() {
    map.removeLayer(lightTileLayer);
    darkTileLayer.addTo(map);
}

function switchToLightMode() {
    map.removeLayer(darkTileLayer);
    lightTileLayer.addTo(map);
}

async function initMap() {
    neighborhoodData = await loadGeoJson('data/buurt.geojson');
    allStreetsData = await loadGeoJson('data/filtered_4_percentage.geojson');
    neighborhoodLayer = L.geoJSON(neighborhoodData, {
        style: { color: 'grey', weight: 0.8, fillOpacity: 0.0, fillColor: getWhite() },
        onEachFeature: function (feature, layer) {
            layer.on('click', function () {
                const neighborhoodIndex = neighborhoodData.features.indexOf(feature);
                updateMap(neighborhoodIndex);
                document.getElementById('neighborhood-select').value = neighborhoodIndex;
            });
            layer.on('mouseover', function (e) {
                layer.setStyle({ weight: 3, color: getBlack() });
                const tooltip = L.tooltip({
                    permanent: false,
                    direction: 'top',
                    className: 'neighborhood-tooltip'
                })
                    .setContent(feature.properties.Buurt)
                    .setLatLng(e.latlng);
                layer.bindTooltip(tooltip).openTooltip();
            });
            layer.on('mouseout', function () {
                neighborhoodLayer.resetStyle(layer);
                layer.unbindTooltip();
            });
        }
    }).addTo(map);

    const select = document.getElementById('neighborhood-select');

    const sortedFeatures = neighborhoodData.features.sort((a, b) => {
        const nameA = a.properties.Buurt.toLowerCase();
        const nameB = b.properties.Buurt.toLowerCase();
        return nameA.localeCompare(nameB);
    });

    sortedFeatures.forEach((feature, index) => {
        const option = document.createElement('option');
        option.value = index;
        const buurtName = feature.properties.Buurt;
        const buurtCode = feature.properties.Buurtcode;
        option.textContent = `${buurtName} (${buurtCode})`;
        select.appendChild(option);
    });

    clusterData = await loadGeoJson('data/gdf_simple_clusters.geojson');

    updateMap('all');

    select.addEventListener('change', (e) => {
        const neighborhoodIndex = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        updateMap(neighborhoodIndex);
    });

    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', () => {
        select.value = 'all';
        updateMap('all');
    });

    const searchBar = document.getElementById('search-bar');
    const searchButton = document.getElementById('search-button');

    searchBar.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchAndZoom(searchBar.value);
        }
    });

    searchButton.addEventListener('click', function () {
        searchAndZoom(searchBar.value);
    });
}

initMap();
