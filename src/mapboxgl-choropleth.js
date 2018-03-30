// import {$, jQuery} from 'jquery';
import config from '../config';
import chroma from 'chroma-js';


;(function( $, window, document, undefined ) {
    /**
     * Plugin namespace
     */
    let namespace = {
        pluginName: 'Choropleth'
    };

    /**
     * Default Options
     */
    let defaultOptions = {
        /**
         * Mapbox configuration
         */
        mapboxConfig: {
            container: 'map',
            style: 'mapbox://styles/aosika/cjbepjvcn94182rmrjfnpudra',
            center: [0, 0],
            zoom: 1
        }, // mapbox

        /**
         * Map configuration
         */
        mapConfig: {
            legendReverse: true
        },

        featureClickEventCallback(event) {

        }
    };

    /**
     * Constructor
     */
    namespace['pluginName'] = function( userOptions ) {
        // Combine/merge default and user options
        this.options = $.extend( true, defaultOptions, userOptions );

        /**
         * Init
         */
        this.init();

        /**
         * Controller
         */
        this.controller = {

        }
    }

    /**
     * Prototype
     */
    
    namespace['pluginName'].prototype = {
        /*------------------------------------*\
          STATE
        \*------------------------------------*/
        map: null,
        activeLayer: null,
        activeLayerPropName: null,
        activeLayerProps: null,
        customLayers: [],
        $mapContainer: $('.mapboxgl-choropleth-container'),
        mapLegend: 'mapboxgl-choropleth-legend',

        /**
         * Init
         */
        init() {
            // console.log('init');
            this.instantiateMap();

        }, // init()

        /**
         * Instantiate mapbox
         */
        instantiateMap() {
            // Map instance
            let map;
            // Mapbox access token
            mapboxgl.accessToken = config.mapboxAccessToken;
            // Instantiate mapbox
            map = new mapboxgl.Map(this.options.mapboxConfig);

            this.map = map;

            this.createColorScales();

            // Map load promise
            new Promise((resolve, reject) => {
                this.map.on('load', this.mapLoaded.bind(this, resolve));
            }).then(this.afterMapLoaded.bind(this, this.map));
        }, // instantiateMap()

        /**
         * 
         */
        mapLoaded(resolve) {
            // Resolve map load promise
            resolve();

            // Add map layers
            this.addMapLayers();
        },

        /**
         * 
         */
        afterMapLoaded(map) {
            this.initFeatureClickEvent();
            this.initRevealActivelayerEvent();
            this.initPropEvent();
            this.hoverEvent();
            this.addMapLegend();
        },

        /**
         * 
         */
        addMapLayers() {
            let layers = this.map.getStyle().layers;
            // Find the index of the first symbol layer in the map style
            let firstSymbolId;
            for (let i = 0; i < layers.length; i++) {
                if (layers[i].type === 'symbol') {
                    firstSymbolId = layers[i].id;
                    break;
                }
            }
            this.options.mapConfig.layers.forEach((layer, index) => {
                // Add map source
                this.map.addSource(layer.source.id, {
                    type: layer.source.type,
                    data: layer.source.data
                });

                // Add layers to map
                this.map.addLayer({
                    "id": layer.id,
                    "type": "fill",
                    "source": layer.source.id,
                    "paint": {
                        "fill-color": this.paintFill(layer.properties[0]),
                        "fill-opacity": 0.8
                    },
                    'layout': {
                        'visibility': 'none'
                    }
                }, firstSymbolId);

                // this.map.setFilter('countries-layer', ['match', ['get', 'name'], ['Panama', 'Angola'], true, false]);

                this.map.setFilter('countries-layer', ['has', 'density']);

                // Store all the custom layers
                this.customLayers.push(layer.id);
            });

            // Show the first layer
            this.revealActiveLayer(this.options.mapConfig.layers[0].id);

            // Set the first layer property name
            this.setActivePropName(this.options.mapConfig.layers[0].properties[0].property);

            // Set active properties
            this.setActiveProperties();
        },

        /**
         * 
         */
        createColorScales() {
            this.options.mapConfig.layers.map((layer) => {
                let colorScale;

                layer.properties.map((property) => {
                    colorScale = chroma.scale(property.colors).mode('lch').colors(property.step.length);

                    property['colorScale'] = colorScale;
                });


            });
        },

        /**
         * 
         */
        paintFill(prop) {
            let fillColorArray = [
                'step',
                ['get', prop.property]
            ];

            prop.colorScale.map((color, index) => {
                if (index > 0) {
                    fillColorArray.push(prop.step[index])    
                }

                fillColorArray.push(color);
            })

            return fillColorArray;
        },

        /**
         * 
         */
        initFeatureClickEvent() {
            // Add click event to each custom layer
            this.customLayers.forEach((layer) => {
                this.map.on('click', layer, this.featureClickEventHandler.bind(this));
            });
        },

        /**
         * 
         */
        featureClickEventHandler(event) {
            this.options.featureClickEventCallback(event);
        },

        /**
         * Click event for layer reveals/hide
         */
        initRevealActivelayerEvent() {
            $('.js-choropleth-layer-anchor').on('click', this.revealActiveLayerEventHandler.bind(this))
        },

        /**
         * Handles the anchor event for showing/revealing layers
         */
        revealActiveLayerEventHandler(event) {
            event.preventDefault();
            event.stopPropagation();

            // Get name of clicked layer from anchor
            let clickedLayer = $(event.currentTarget).attr('data-layer');

            this.revealActiveLayer(clickedLayer);
        },

        /**
         * Show user selected layer (active layer)
         */
        revealActiveLayer(activeLayer) {
            this.activeLayer = activeLayer;

            // Hide unclicked layers
            this.customLayers.forEach((layer) => {
                if (layer !== activeLayer) {
                    this.map.setLayoutProperty(layer, 'visibility', 'none')
                }
            })

            // Double check visibility of layer
            let visibility = this.map.getLayoutProperty(activeLayer, 'visibility');

            // Hide layer if it wasn't visible before, otherwise reveal it
            if (visibility === 'visible') {
                this.map.setLayoutProperty(activeLayer, 'visibility', 'none');
            } else {
                this.map.setLayoutProperty(activeLayer, 'visibility', 'visible');
            }
        },


        /**
         * Add a hover event for polygons
         */
        hoverEvent(activeLayer) {
            this.customLayers.forEach((layer) => {
                this.map.on('mouseenter', layer, (event) => {
                    this.map.getCanvas().style.cursor = 'pointer';
                })
                this.map.on('mouseleave', layer, (event) => {
                    this.map.getCanvas().style.cursor = '';
                });
            })
        },


        /**
         * Init the event handler for layer properties
         */
        initPropEvent() {
            $('.js-choropleth-prop-anchor').on('click', this.propEventHandler.bind(this));
        },

        /**
         * Handles the event for layer properties (when users select a property to show on the map)
         */
        propEventHandler(event) {
            event.preventDefault();
            event.stopPropagation();

            let clickedProp = $(event.currentTarget).attr('data-prop');

            this.options.mapConfig.layers.map((layer) => {
                if (this.activeLayer === layer.id) {
                    layer.properties.map((prop) => {
                        if (prop.property === clickedProp) {
                            this.map.setPaintProperty(this.activeLayer, 'fill-color', this.paintFill(prop));
                        }
                    });
                }
            })
        },

        /**
         * 
         */
        setActivePropName(propName) {
            this.activeLayerPropName = propName;
        },

        /**
         * 
         */
        setActiveProperties() {
            this.options.mapConfig.layers.map((item) => {
                if (item.id === this.activeLayer) {
                    item.properties.map((property) => {
                        if (property.property === this.activeLayerPropName) {
                            this.activeLayerProps = property;
                        }
                    })
                }
            })
        },

        /**
         * Add legends to the map
         */
        addMapLegend() {
            console.log(this.activeLayerProps);

            if ($(`.${this.mapLegend}`).length) {
                $(`.${this.mapLegend}`).remove();
            }

            let colorScale = this.activeLayerProps.colorScale;
            let steps = this.activeLayerProps.step;

            // Reverse the legend
            if (this.options.mapConfig.legendReverse) {
                colorScale = colorScale.slice().reverse();
                steps = steps.slice().reverse();
            }

            let rows = '';
            let stepsLength = steps.length;


            colorScale.forEach((color, index) => {
                let rowTitle;

                if (this.options.mapConfig.legendReverse) {
                    if (index === 0) {
                        rowTitle = `${steps[index]}+`;
                    } else {
                        rowTitle = `${steps[index]}–${steps[index - 1]}`;
                    }
                } else {
                    if (index < (stepsLength-1)) {
                        rowTitle = `${steps[index]}–${steps[index + 1]}`;
                    } else {
                        rowTitle = `${steps[index]}+`;
                    }                    
                }

                rows += `
                    <div class="mapboxgl-choropleth-legend__row">
                        <div class="mapboxgl-choropleth-legend__fill" style="background-color: ${color};"></div>
                        <div class="mapboxgl-choropleth-legend__title">
                            ${rowTitle}
                        </div>
                    </div>
                `;
            })

            this.$mapContainer.append(`
                <div class="${this.mapLegend}">
                    <div class="mapboxgl-choropleth-legend__wrapper">
                        ${rows}
                    </div>
                </div>
            `)
        }
        
    }

    // console.log($.fn);




    /*------------------------------------*\
      Export 
    \*------------------------------------*/
    module.exports = namespace['pluginName'];

})( jQuery, window , document );