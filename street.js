function addStreetInteractions(layer) {
    layer.on('mouseover', function (e) {
        const properties = e.target.feature.properties;
        let riskLevel = 'Low risk';
        if (properties.Final_score_all >= 1.9) {
            riskLevel = 'High risk';
        } else if (properties.Final_score_all >= 1.5) {
            riskLevel = 'Medium risk';
        }

        const streetName = properties.name === 0 ? 'Unnamed' : properties.name;

        const tooltipContent = `
            <strong>${streetName}</strong><br>
            <strong>${riskLevel}</strong> (${properties.Final_score_all})
        `;
        const tooltip = L.tooltip({
            permanent: false,
            direction: 'top',
            className: 'street-tooltip'
        })
            .setContent(tooltipContent)
            .setLatLng(e.latlng);
        layer.bindTooltip(tooltip).openTooltip();
        layer.setStyle({ weight: 5, color: '#dcdcdc' });
    });

    layer.on('mouseout', function (e) {
        layer.unbindTooltip();
        streetLayer.resetStyle(e.target);
    });

    layer.on('click', function (e) {
        const properties = e.target.feature.properties;
        let riskLevel = 'Low risk';
        if (properties.Final_score_all >= 1.75) {
            riskLevel = 'High risk';
        } else if (properties.Final_score_all >= 1.5) {
            riskLevel = 'Medium risk';
        }

        const streetName = properties.name === 0 ? 'Unnamed' : properties.name;

        let flowLevel = 'Low flow';
        if (properties.usage_count_mean >= 1000) {
            flowLevel = 'High flow';
        } else if (properties.usage_count_mean >= 250) {
            flowLevel = 'Medium flow';
        }

        let shadeLevel = 'Sufficient shade';
        if (properties.sum_adjust >= 12) {
            shadeLevel = 'Insufficient shade';
        }

        const infoBox = document.getElementById('info-box');
        infoBox.innerHTML = `
            <button class="close-button" onclick="closeInfoBox()">
                <img src="img/right.png" alt="Close" class="close-icon">
            </button>
            <div class="final-score"><strong>${riskLevel}</strong> (${properties.Final_score_all.toFixed(2)})</div>
            <div class="street-name">${streetName}</div>
            <div id="chart1" class="chart-section"></div>
            <div id="chart2" class="chart-section"></div>
            <div id="chart3" class="chart-section"></div>
        `;
        infoBox.style.display = 'block';
        renderCharts(properties, flowLevel, shadeLevel);
    });
}

function renderCharts(properties, flowLevel, shadeLevel) {
    renderChart1(properties, flowLevel);
    renderChart2(properties, shadeLevel);
    renderChart3(properties);
}

function renderChart1(properties, flowLevel) {
    const chart1 = document.getElementById('chart1');
    chart1.innerHTML = `
        <div class="chart-title">Modelled Pedestrian Intensity</div>
        <div class="chart-value">${flowLevel}</div>
        <div id="age-group-chart" class="age-group-chart"></div>
    `;
    renderAgeGroupChart();
}

function renderAgeGroupChart() {
    const data = [
        { ageGroup: '<18', percentage: 15 },
        { ageGroup: '18-65', percentage: 60 },
        { ageGroup: '>65', percentage: 25 }
    ];

    const svg = d3.select('#age-group-chart').append('svg')
        .attr('width', '100%')
        .attr('height', 50);

    const widthScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, 300]);

    const colorScale = d3.scaleOrdinal()
        .domain(['<18', '18-65', '>65'])
        .range(['#d53e4f', '#dcdcdc', '#d53e4f']);

    let cumulativeWidth = 0;
    svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => {
            const x = cumulativeWidth;
            cumulativeWidth += widthScale(d.percentage);
            return x;
        })
        .attr('y', 0)
        .attr('width', d => widthScale(d.percentage))
        .attr('height', 20)
        .attr('fill', d => colorScale(d.ageGroup));

    cumulativeWidth = 0;
    svg.selectAll('text')
        .data(data)
        .enter()
        .append('text')
        .attr('x', d => {
            const x = cumulativeWidth + 5 + widthScale(d.percentage) / 2;
            cumulativeWidth += widthScale(d.percentage);
            return x;
        })
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .text(d => `${d.ageGroup}: ${d.percentage}%`)
        .attr('class', 'chart-tick-label');
}

function renderChart2(properties, shadeLevel) {
    const chart2 = document.getElementById('chart2');
    chart2.innerHTML = `
        <div class="chart-title">Shade Index</div>
        <div class="chart-value">${shadeLevel}</div>
    `;
    renderBarChart(properties);
}

function renderBarChart(properties) {
    const data = [
        { hour: '09:00', value: 1 - properties['0900'] },
        { hour: '09:30', value: 1 - properties['0930'] },
        { hour: '10:00', value: 1 - properties['1000'] },
        { hour: '10:30', value: 1 - properties['1030'] },
        { hour: '11:00', value: 1 - properties['1100'] },
        { hour: '11:30', value: 1 - properties['1130'] },
        { hour: '12:00', value: 1 - properties['1200'] },
        { hour: '12:30', value: 1 - properties['1230'] },
        { hour: '13:00', value: 1 - properties['1300'] },
        { hour: '13:30', value: 1 - properties['1330'] },
        { hour: '14:00', value: 1 - properties['1400'] },
        { hour: '14:30', value: 1 - properties['1430'] },
        { hour: '15:00', value: 1 - properties['1500'] },
        { hour: '15:30', value: 1 - properties['1530'] },
        { hour: '16:00', value: 1 - properties['1600'] },
        { hour: '16:30', value: 1 - properties['1630'] },
        { hour: '17:00', value: 1 - properties['1700'] },
        { hour: '17:30', value: 1 - properties['1730'] },
        { hour: '18:00', value: 1 - properties['1800'] },
        { hour: '18:30', value: 1 - properties['1830'] },
        { hour: '19:00', value: 1 - properties['1900'] },
        { hour: '19:30', value: 1 - properties['1930'] },
        { hour: '20:00', value: 1 - properties['2000'] }
    ];

    const opacityValues = {
        '0900': 0.3,
        '0930': 0.3,
        '1000': 0.5,
        '1030': 0.5,
        '1100': 0.5,
        '1130': 1.0,
        '1200': 1.0,
        '1230': 1.0,
        '1300': 1.0,
        '1330': 1.0,
        '1400': 1.0,
        '1430': 1.0,
        '1500': 1.0,
        '1530': 1.0,
        '1600': 1.0,
        '1630': 1.0,
        '1700': 0.5,
        '1730': 0.5,
        '1800': 0.5,
        '1830': 0.5,
        '1900': 0.3,
        '1930': 0.3,
        '2000': 0.3
    };

    const svg = d3.select('#chart2').append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = svg.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = svg.node().getBoundingClientRect().height - margin.top - margin.bottom;

    const x = d3.scaleBand()
        .domain(data.map(d => d.hour))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, 1])
        .nice()
        .range([height, 0]);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickValues(data.map(d => d.hour)).tickFormat((d, i) => i % 2 === 0 ? d : ''))
        .selectAll('text')
        .style('font-size', '8.5px');

    g.append('g')
        .attr('class', 'axis axis--y')
        .call(d3.axisLeft(y).ticks(10, '%'));

    g.selectAll('.bar')
        .data(data)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.hour))
        .attr('y', d => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', '#b4e0ea')
        .attr('fill-opacity', d => opacityValues[d.hour.replace(':', '')]);
}

function renderChart3(properties) {
    const chart3 = document.getElementById('chart3');
    chart3.innerHTML = `
    <div class="chart-title">PET</div>
    <div class="chart-value">${properties.PET_mean.toFixed(2)}&#8451;</div>
    `;
    createGaugeChart('chart3', properties.PET_mean);
}

function createGaugeChart(chartId, selectedValue) {
    const svg = d3.select(`#${chartId}`).append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', '0 0 220 120')
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const arc = d3.arc()
        .innerRadius(40)
        .outerRadius(80)
        .startAngle(-Math.PI / 2)
        .endAngle(Math.PI / 2);

    const colorSegments = [
        { startAngle: -Math.PI / 2, endAngle: ((29 - 25) / 25) * Math.PI - Math.PI / 2, color: 'rgba(255, 0, 0, 0.2)' },
        { startAngle: ((29 - 25) / 25) * Math.PI - Math.PI / 2, endAngle: ((35 - 25) / 25) * Math.PI - Math.PI / 2, color: 'rgba(255, 0, 0, 0.4)' },
        { startAngle: ((35 - 25) / 25) * Math.PI - Math.PI / 2, endAngle: ((41 - 25) / 25) * Math.PI - Math.PI / 2, color: 'rgba(255, 0, 0, 0.6)' },
        { startAngle: ((41 - 25) / 25) * Math.PI - Math.PI / 2, endAngle: ((46 - 25) / 25) * Math.PI - Math.PI / 2, color: 'rgba(255, 0, 0, 0.8)' },
        { startAngle: ((46 - 25) / 25) * Math.PI - Math.PI / 2, endAngle: Math.PI / 2, color: 'rgba(255, 0, 0, 1)' }
    ];

    colorSegments.forEach(segment => {
        svg.append('path')
            .datum(segment)
            .attr('d', d3.arc()
                .innerRadius(40)
                .outerRadius(80)
                .startAngle(segment.startAngle)
                .endAngle(segment.endAngle))
            .attr('transform', 'translate(110, 110)')
            .attr('fill', segment.color);
    });

    const ticks = [29, 35, 41, 46];
    const radiusOuter = 82;
    const radiusInner = 35;
    ticks.forEach(tickValue => {
        const angle = ((tickValue - 25) / 25) * Math.PI - Math.PI / 2;
        const xOuter = 110 + radiusOuter * Math.cos(angle - Math.PI / 2);
        const yOuter = 110 + radiusOuter * Math.sin(angle - Math.PI / 2);
        const xInner = 110 + radiusInner * Math.cos(angle - Math.PI / 2);
        const yInner = 110 + radiusInner * Math.sin(angle - Math.PI / 2);

        svg.append('line')
            .attr('x1', xOuter)
            .attr('y1', yOuter)
            .attr('x2', xInner)
            .attr('y2', yInner)
            .attr('class', 'chart-tick-stroke');

        const xLabel = 110 + (radiusInner + 55) * Math.cos(angle - Math.PI / 2);
        const yLabel = 110 + (radiusInner + 55) * Math.sin(angle - Math.PI / 2);
        svg.append('text')
            .attr('x', xLabel)
            .attr('y', yLabel)
            .attr('class', 'chart-tick-label')
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('dominant-baseline', 'middle')
            .text(tickValue);
    });

    const pointerAngle = Math.max(-Math.PI / 2, Math.min(((selectedValue - 25) / 25) * Math.PI - Math.PI / 2, Math.PI / 2));
    const pointerLength = 70;
    svg.append('line')
        .attr('x1', 110)
        .attr('y1', 110)
        .attr('x2', 110 + pointerLength * Math.cos(pointerAngle - Math.PI / 2))
        .attr('y2', 110 + pointerLength * Math.sin(pointerAngle - Math.PI / 2))
        .attr('class', 'chart-pointer-stroke');

    svg.append('circle')
        .attr('cx', 110)
        .attr('cy', 110)
        .attr('r', 5)
        .attr('class', 'chart-pointer-stroke');

    svg.append('text')
        .attr('x', 110)
        .attr('y', 140)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text(selectedValue.toFixed(2));
}

function applyStreetInteractions() {
    streetLayer.eachLayer(function (layer) {
        addStreetInteractions(layer);
    });
}

map.on('layeradd', function (e) {
    if (e.layer === streetLayer) {
        applyStreetInteractions();
    }
});

function closeInfoBox() {
    document.getElementById('info-box').style.display = 'none';
}

