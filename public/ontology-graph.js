// Ontology Graph Visualization with D3.js (Palantir Style)
class OntologyGraph {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.width = this.container.node().getBoundingClientRect().width || 1200;
        this.height = 700;
        this.simulation = null;
        this.data = { nodes: [], links: [] };

        this.init();
        this.setupResizeListener();
    }

    init() {
        // Clear existing SVG
        this.container.selectAll('*').remove();

        // Create SVG
        this.svg = this.container.append('svg')
            .attr('width', '100%')
            .attr('height', this.height)
            .style('background', '#1a1d2e')
            .style('border-radius', '8px');

        // Add Glow Filters
        const defs = this.svg.append('defs');

        // Blue Glow (Franchise)
        const filterBlue = defs.append('filter').attr('id', 'glow-blue');
        filterBlue.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
        const feMergeBlue = filterBlue.append('feMerge');
        feMergeBlue.append('feMergeNode').attr('in', 'coloredBlur');
        feMergeBlue.append('feMergeNode').attr('in', 'SourceGraphic');

        // Red Glow (External/Risk)
        const filterRed = defs.append('filter').attr('id', 'glow-red');
        filterRed.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
        const feMergeRed = filterRed.append('feMerge');
        feMergeRed.append('feMergeNode').attr('in', 'coloredBlur');
        feMergeRed.append('feMergeNode').attr('in', 'SourceGraphic');

        // Arrow markers
        const markers = [
            { id: 'arrow-manages', color: '#6c757d' },
            { id: 'arrow-affects', color: '#ff6b6b' },
            { id: 'arrow-located_at', color: '#495057' }
        ];

        markers.forEach(m => {
            defs.append('marker')
                .attr('id', m.id)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 25) // Offset to not overlap node
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', m.color);
        });

        // Main group for zoom/pan
        this.g = this.svg.append('g');

        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });

        this.svg.call(zoom);
    }

    async loadData() {
        try {
            const response = await fetch('/api/analysis/graph-data');
            if (!response.ok) throw new Error('Failed to fetch data');
            this.data = await response.json();
            this.render(this.data);
        } catch (error) {
            console.error('Failed to load ontology data:', error);
            // Fallback to mock data if API fails
            this.renderMockData();
        }
    }

    renderMockData() {
        const mockData = {
            nodes: [
                { id: 'f1', type: 'franchise', name: '강남점' },
                { id: 'f2', type: 'franchise', name: '부산점' },
                { id: 's1', type: 'sv', name: '김철수 SV' },
                { id: 'e1', type: 'external', name: 'SNS 타겟 광고' },
                { id: 'l1', type: 'location', name: '서울 강남구' }
            ],
            links: [
                { source: 's1', target: 'f1', type: 'manages' },
                { source: 'e1', target: 'f1', type: 'affects' },
                { source: 'f1', target: 'l1', type: 'located_at' }
            ]
        };
        this.render(mockData);
    }

    render(data) {
        // Stop existing simulation
        if (this.simulation) this.simulation.stop();

        const nodes = data.nodes;
        const links = data.links.map(d => Object.create(d)); // Copy links to avoid mutating original data

        // Simulation setup
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collide', d3.forceCollide().radius(40));

        // Draw Links
        const link = this.g.selectAll('.link')
            .data(links)
            .join('line')
            .attr('class', d => `link ${d.type}`)
            .attr('stroke', d => this.getLinkColor(d.type))
            .attr('stroke-width', d => d.type === 'affects' ? 2 : 1.5)
            .attr('stroke-dasharray', d => d.type === 'affects' ? '5,5' : 'none')
            .attr('marker-end', d => `url(#arrow-${d.type})`);

        // Draw Nodes
        const node = this.g.selectAll('.node')
            .data(nodes)
            .join('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', (event, d) => this.dragstarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragended(event, d)));

        // Node Circles
        node.append('circle')
            .attr('r', d => this.getNodeSize(d.type))
            .attr('fill', d => this.getNodeColor(d.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('filter', d => d.type === 'external' ? 'url(#glow-red)' : (d.type === 'franchise' ? 'url(#glow-blue)' : 'none'));

        // Node Icons
        node.append('text')
            .attr('dy', 6)
            .attr('text-anchor', 'middle')
            .attr('font-size', d => this.getNodeSize(d.type) * 0.6)
            .text(d => this.getNodeIcon(d.type))
            .style('pointer-events', 'none');

        // Node Labels
        const labels = node.append('text')
            .attr('dy', d => this.getNodeSize(d.type) + 15)
            .attr('text-anchor', 'middle')
            .text(d => d.name)
            .attr('fill', '#e0e0e0')
            .attr('font-size', '12px')
            .attr('class', 'node-label');

        // Simulation Tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Store references for filtering
        this.nodeElements = node;
        this.linkElements = link;
        this.labelElements = labels;
    }

    getNodeColor(type) {
        const colors = {
            franchise: '#4a90e2', // Blue
            sv: '#2ecc71',        // Green
            external: '#ff6b6b',  // Red
            location: '#95a5a6'   // Grey
        };
        return colors[type] || '#7f8c8d';
    }

    getNodeSize(type) {
        const sizes = {
            franchise: 25,
            sv: 22,
            external: 20,
            location: 18
        };
        return sizes[type] || 20;
    }

    getNodeIcon(type) {
        const icons = {
            franchise: '🏢',
            sv: '👤',
            external: '📢',
            location: '📍'
        };
        return icons[type] || '●';
    }

    getLinkColor(type) {
        const colors = {
            manages: '#6c757d',
            affects: '#ff6b6b',
            located_at: '#495057'
        };
        return colors[type] || '#6c757d';
    }

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    reset() {
        this.svg.transition().duration(750).call(
            d3.zoom().transform,
            d3.zoomIdentity
        );
    }

    toggleLabels() {
        const currentOpacity = this.labelElements.style('opacity');
        this.labelElements.transition().style('opacity', currentOpacity === '0' ? '1' : '0');
    }

    filter(type) {
        if (type === 'all') {
            this.nodeElements.style('opacity', 1);
            this.linkElements.style('opacity', 1);
        } else {
            this.nodeElements.style('opacity', d => d.type === type ? 1 : 0.1);
            this.linkElements.style('opacity', 0.1);
        }
    }

    setupResizeListener() {
        window.addEventListener('resize', () => {
            this.width = this.container.node().getBoundingClientRect().width;
            this.svg.attr('width', this.width);
            this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
            this.simulation.alpha(0.3).restart();
        });
    }
}

// Global instance
let ontologyGraphInstance = null;

// Initialize graph
window.initOntologyGraph = function () {
    if (!ontologyGraphInstance) {
        ontologyGraphInstance = new OntologyGraph('ontology-graph');
        ontologyGraphInstance.loadData();

        // Setup controls
        document.getElementById('reset-graph')?.addEventListener('click', () => ontologyGraphInstance.reset());
        document.getElementById('toggle-labels')?.addEventListener('click', () => ontologyGraphInstance.toggleLabels());
        document.getElementById('filter-type')?.addEventListener('change', (e) => ontologyGraphInstance.filter(e.target.value));
    } else {
        // Reload data if already initialized (to get fresh data)
        ontologyGraphInstance.loadData();
    }
};
