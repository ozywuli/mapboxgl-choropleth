// import {$, jQuery} from 'jquery';
import config from '../config';
import chroma from 'chroma-js';
import getParameterByName from './helpers/getParameterByName';


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
        activeLayerPropProperties: null,
        customLayers: [],
        $mapContainer: $('.mapboxgl-choropleth-container'),
        mapLegend: 'mapboxgl-choropleth-legend',

        /**
         * Init
         */
        init() {
            // console.log('init')
            this.instantiateMap();
        }, // init()


        /**
         * Instantiate mapbox map
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
         * When the map is loaded
         */
        mapLoaded(resolve) {
            // Resolve map load promise
            resolve();

            // Add map layers
            this.addMapLayers();
        }, /// mapLoaded()


        /**
         * After the map is laoded
         */
        afterMapLoaded(map) {
            this.initQueryParamListener();
            this.initFeatureClickEvent();
            this.initLayerEvent();
            this.initPropEvent();
            this.hoverEvent();
        }, // afterMapLoaded()


        /**
         * Add Mapbox map layers
         */
        addMapLayers() {
            // console.log('method: addMapLayers');
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
        }, // addMapLayers


        /**
         * Listen to query parameter changes
         */
        initQueryParamListener() {
            // console.log('method: initQueryParamListener');

            this.checkQueryParam();

            window.onpopstate = history.onpushstate = (event) => {
                this.checkQueryParam();
            }

        }, // initQueryParamListener()


        /**
         * Check query param
         */
        checkQueryParam() {
            let paramLayer = getParameterByName('layer');
            let paramProperty = getParameterByName('property');

            if (paramLayer) {
                if (paramProperty) {
                    this.updateLayer(paramLayer, paramProperty);
                } else {
                    this.updateLayer(paramLayer);
                }
            } else {
                this.updateLayer();
            }
        }, // checkQueryParam()


        /**
         * Update query param
         */
        updateQueryParam(layer, property) {
            // Get the layer name from the URL
            let queryString = `layer=${layer}`;

            // Get the property name (if it exists) from the URL
            if (property) {
                queryString += `&property=${property}`;
            }

            // Construct the new URL from the query string
            let pageUrl = '?' + queryString;
            window.history.pushState('', '', pageUrl);

            // Update layer
            this.updateLayer(layer, property);
        }, // updateQueryParam()


        /**
         * Preprocess colors to add a color scale
         */
        createColorScales() {
            this.options.mapConfig.layers.map((layer) => {
                let colorScale;

                layer.properties.map((property) => {
                    colorScale = chroma.scale(property.colors).mode('lch').colors(property.step.length);

                    property['colorScale'] = colorScale;
                });


            });
        }, // createColorScales()


        /**
         * Set up the fill for layers
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
        }, // paintFill()


        /**
         * Initialize click events for all features
         */
        initFeatureClickEvent() {
            // Add click event to each custom layer
            this.customLayers.forEach((layer) => {
                this.map.on('click', layer, this.featureClickEventHandler.bind(this));
            });
        }, // initFeatureClickEvent


        /**
         * Handles the click event for features
         */
        featureClickEventHandler(event) {
            this.options.featureClickEventCallback(event);
        }, // featureClickEventHandler


        /**
         * Click event for layer reveals/hide
         */
        initLayerEvent() {
            $('.js-choropleth-layer-anchor').on('click', this.layerEventHandler.bind(this))
        }, // initLayerEvent


        /**
         * Handles the anchor event for showing/revealing layers
         */
        layerEventHandler(event) {
            event.preventDefault();
            event.stopPropagation();

            // Get name of clicked layer from anchor
            let clickedLayer = $(event.currentTarget).attr('data-layer');

            this.updateQueryParam(clickedLayer);
        }, // layerEventHandler()


        /**
         * Show user selected layer (active layer)
         */
        revealActiveLayer(activeLayer) {
            // console.log('method: revealActiveLayer');

            this.mapLayer.setActiveLayer.call(this, activeLayer);

            // Hide unclicked layers
            this.customLayers.forEach((layer) => {
                if (layer !== activeLayer) {
                    this.map.setLayoutProperty(layer, 'visibility', 'none')
                }
            })

            // Double check visibility of layer
            let visibility = this.map.getLayoutProperty(activeLayer, 'visibility');

            // Reveal layer if it isn't visible
            if (visibility !== 'visible') {
                this.map.setLayoutProperty(activeLayer, 'visibility', 'visible');
            }
        }, // revealActiveLayer


        /**
         * Update layer
         */
        updateLayer(layer, propertyName) {
            console.log('method: updateLayer');

            if (layer) {
                // Reveal this layer
                this.revealActiveLayer(layer);
            } else {
                // Reveal this layer
                this.revealActiveLayer(this.options.mapConfig.layers[0].id);
            }


            // if property isn't passed in
            if (!propertyName) {
                // Set active properties
                this.mapLayer.setActiveProperty.call(this, this.mapLayer.findLayer.call(this, layer).properties[0].property)
            } else {
                this.mapLayer.findLayer.call(this, this.activeLayer).properties.map((property) => {
                    if (property.property === propertyName) {
                        this.map.setPaintProperty(this.activeLayer, 'fill-color', this.paintFill(property));
                        this.mapLayer.setActiveProperty.call(this, propertyName);
                    }
                });
            }

            // Update map legend
            this.addMapLegend();
        }, // updateLayer()


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
        }, // hoverEvent()


        /**
         * Init the event handler for layer properties
         */
        initPropEvent() {
            $('.js-choropleth-prop-anchor').on('click', this.propEventHandler.bind(this));
        }, // initPropEvent()


        /**
         * Handles the event for layer properties (when users select a property to show on the map)
         */
        propEventHandler(event) {
            event.preventDefault();
            event.stopPropagation();

            let clickedLayer = $(event.currentTarget).attr('data-layer');
            let clickedProp = $(event.currentTarget).attr('data-prop');

            this.updateQueryParam(clickedLayer, clickedProp);
        }, // propEventHandler

        /**
         * The layer property object
         */
        mapLayer: {
            setActiveLayer(layer) {
                this.activeLayer = layer;
            },
            findLayer(layerName) {
                let foundLayer;
                this.options.mapConfig.layers.map((layer) => {
                    if (layer.id === layerName) {
                        foundLayer = layer;
                    }
                });
                return foundLayer;
            },
            setActivePropName(propName) {
                this.activeLayerPropName = propName;
            },
            setActivePropProperties() {
                this.mapLayer.findLayer.call(this, this.activeLayer).properties.map((property) => {
                    if (property.property === this.activeLayerPropName) {
                        this.activeLayerPropProperties = property;
                    }                    
                });
            },
            setActiveProperty(propName) {
                this.mapLayer.setActivePropName.call(this, propName);
                this.mapLayer.setActivePropProperties.call(this);
            }
        }, // maplayer


        /**
         * Add legends to the map
         */
        addMapLegend() {
            // console.log('method: addMapLegend');
            // console.log(this.activeLayerPropName);
            // console.log(this.activeLayerPropProperties);

            if ($(`.${this.mapLegend}`).length) {
                $(`.${this.mapLegend}`).remove();
            }

            let colorScale = this.activeLayerPropProperties.colorScale;
            let steps = this.activeLayerPropProperties.step;

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
        } // addMapLegend()
        
    } // prototype

    // console.log($.fn);




    /*------------------------------------*\
      Export 
    \*------------------------------------*/
    module.exports = namespace['pluginName'];

})( jQuery, window , document );