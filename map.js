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
let allStreetsData = null;

async function loadGeoJson(url) {
    const response = await fetch(url, { mode: 'no-cors' });
    return response.json();
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
    if (score >= 1.75) return '#E25701';
    if (score >= 1.5) return '#FF8615';
    if (score >= 1.25) return '#FFAF4D';
    if (score >= 1) return '#FFF0B9';
    return '#998EC3';
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

function createLegend() {
    const legend = document.createElement('div');
    legend.className = 'legend';

    const heatStressSection = createLegendSection('Heat Stress Risk', 'legend-gradient', ['High risk', 'Medium risk', 'Low risk']);
    const pedestrianFlowSection = createLegendSection('Pedestrian Flow', 'legend-line-container', [
        { className: 'thick', text: 'High' },
        { className: 'medium', text: 'Medium' },
        { className: 'thin', text: 'Low' }
    ], true);

    legend.appendChild(heatStressSection);
    legend.appendChild(pedestrianFlowSection);

    document.body.appendChild(legend);
}

function resetNeighborhoodStyles() {
    neighborhoodLayer.eachLayer(function (layer) {
        neighborhoodLayer.resetStyle(layer);
        layer.unbindTooltip();
    });
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
        streetLayer = L.geoJSON(allStreetsData, {
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
        const buurtCode = selectedNeighborhood.properties.Buurtcode;
        const buurtData = await loadGeoJson(`data/Buurt_data/${buurtCode}.geojson`);

        streetLayer = L.geoJSON(buurtData, {
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
}

initMap();
createLegend();
