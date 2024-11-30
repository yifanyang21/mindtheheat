const map = L.map('map', {
    zoomControl: false
}).setView([0, 0], 13);

let lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
let darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');

lightTileLayer.addTo(map);

let neighborhoodLayer = null;
let streetLayer = null;
let clusterLayer = null;

let neighborhoodData = null;
let streetNetworkData = null;
let clusterData = null;

const mapboxAccessToken = 'pk.eyJ1IjoieWFuZy15ZjE3IiwiYSI6ImNtNDJ1Z3ltODA0aHcyanNmaW8ydjhiNW0ifQ.7zS2UvwwamXU3I9xdvVy0w';
const neighborhoodTileset = 'mapbox://yang-yf17.4mp5nxz4';
const streetNetworkTileset = 'mapbox://yang-yf17.6w1az7z1';
const clusterTileset = 'mapbox://yang-yf17.do3cunh0';

async function loadGeoJson(url) {
    const response = await fetch(url);
    return response.json();
}

async function loadMapboxTileset(tileset) {
    const url = `https://api.mapbox.com/v4/${tileset}/features.json?access_token=${mapboxAccessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load tileset: ${response.statusText}`);
    }
    return response.json();
}

function filterStreetsByScore(data, minScore = 1) {
    return turf.featureCollection(
        data.features.filter(street => street.properties.Final_score_4_perc >= minScore)
    );
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
    if (score >= 1.9) return '#ff0000';
    if (score >= 1.75) return '#ff4000';
    if (score >= 1.35) return '#ff8000';
    if (score >= 1) return '#ffbf00';
    return 'grey';
}

function getStreetWeight_neighbor(usageCountMean) {
    if (usageCountMean >= 2069) return 10;
    if (usageCountMean >= 442) return 7;
    if (usageCountMean >= 1) return 5;
    return 2;
}

function getStreetWeight_city(usageCountMean) {
    if (usageCountMean >= 2069) return 5;
    if (usageCountMean >= 442) return 3;
    if (usageCountMean >= 1) return 2;
    return 2;
}

function createLegendItem(lineStyle, text) {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';

    const legendLine = document.createElement('div');
    legendLine.className = 'legend-line';
    Object.assign(legendLine.style, lineStyle);

    const legendText = document.createElement('span');
    legendText.textContent = text;

    legendItem.appendChild(legendLine);
    legendItem.appendChild(legendText);
    return legendItem;
}

function createLegendSection(title, items, itemRenderer) {
    const section = document.createElement('div');
    section.className = 'legend-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'legend-title';
    sectionTitle.textContent = title;

    section.appendChild(sectionTitle);
    items.forEach(item => {
        const legendItem = itemRenderer(item);
        section.appendChild(legendItem);
    });

    return section;
}

function getBlack() {
    return document.body.classList.contains('dark-mode') ? 'white' : 'black';
}
function getWhite() {
    return document.body.classList.contains('light-mode') ? 'white' : 'black';
}

function createLegend() {
    const legend = document.createElement('div');
    legend.className = 'legend';

    const colorItems = [
        { color: getStreetColor(1.9), text: '>= 1.9' },
        { color: getStreetColor(1.75), text: '1.75 ~ 1.9' },
        { color: getStreetColor(1.35), text: '1.35 ~ 1.75' },
        { color: getStreetColor(1), text: '1 ~ 1.35' },
        { color: getStreetColor(0), text: '< 1' }
    ];

    const colorSection = createLegendSection(
        'Final Score',
        colorItems,
        item => createLegendItem({ backgroundColor: item.color }, item.text)
    );

    const thicknessItems = [
        { height: '10px', text: 'High' },
        { height: '2px', text: 'Low' }
    ];

    const thicknessSection = createLegendSection(
        'Potential Usage',
        thicknessItems,
        item => createLegendItem({ height: item.height }, item.text)
    );

    legend.appendChild(colorSection);
    legend.appendChild(thicknessSection);

    document.body.appendChild(legend);
}

function resetNeighborhoodStyles() {
    neighborhoodLayer.eachLayer(function (layer) {
        neighborhoodLayer.resetStyle(layer);
        layer.unbindTooltip();
    });
}

function updateMap(neighborhoodIndex) {
    const clusterCheckbox = document.getElementById('cluster-checkbox');
    if (clusterCheckbox.checked && clusterData) {
        if (clusterLayer) {
            map.removeLayer(clusterLayer);
        }
        clusterLayer = L.geoJSON(clusterData, {
            style: { color: 'lightblue', weight: 2, fillOpacity: 0.3 }
        }).addTo(map);
    } else if (clusterLayer) {
        map.removeLayer(clusterLayer);
    }

    resetNeighborhoodStyles();
    if (streetLayer) {
        map.removeLayer(streetLayer);
    }

    if (neighborhoodIndex === 'all') {
        const filteredStreets = filterStreetsByScore(streetNetworkData, 1);
        streetLayer = L.geoJSON(filteredStreets, {
            style: function (feature) {
                return {
                    color: getStreetColor(feature.properties.Final_score_4_perc),
                    weight: getStreetWeight_city(feature.properties.usage_count_mean)
                };
            }
        }).addTo(map);

        map.fitBounds(streetLayer.getBounds());
    } else {
        const selectedNeighborhood = neighborhoodData.features[neighborhoodIndex];
        const neighborhoodGeometry = selectedNeighborhood.geometry;

        const filteredStreets = filterStreetsByNeighborhood(neighborhoodGeometry, streetNetworkData);
        streetLayer = L.geoJSON(filteredStreets, {
            style: function (feature) {
                return {
                    color: getStreetColor(feature.properties.Final_score_all),
                    weight: getStreetWeight_neighbor(feature.properties.usage_count_mean)
                };
            }
        }).addTo(map);

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
    neighborhoodData = await loadMapboxTileset(neighborhoodTileset);
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

    streetNetworkData = await loadMapboxTileset(streetNetworkTileset);
    clusterData = await loadMapboxTileset(clusterTileset);

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
}

initMap();
createLegend();
