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
            style: 'mapbox://styles/aosika/cj8tmsx9cdk3m2rqmxbq8gr1b',
            center: [-96, 37.8],
            zoom: 4
        }, // mapbox

        /**
         * Map configuration
         */
        mapConfig: {

        },

        featureClickEventCallback(event) {
            console.log('click event callback');
            console.log(event.features);
            console.log(event.features[0].properties.name);
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
        customLayers: [],

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
            this.initSetPropEvent();
        },

        /**
         * 
         */
        addMapLayers() {
            this.options.mapConfig.layers.forEach((layer, index) => {
                // Add map source
                this.map.addSource(layer.source.id, {
                    type: layer.source.type,
                    data: layer.source.data
                });

                let layerVisibility = 'visible';


                if (index > 0) {
                    layerVisibility = 'none';
                }

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
                        'visibility': layerVisibility
                    }
                });

                this.customLayers.push(layer.id);
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

            let scaleStep = prop.step;

            chroma.scale(prop.colors).mode('lch').colors(scaleStep.length).map((color, index) => {
                if (index > 0) {
                    fillColorArray.push(scaleStep[index])    
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
            $('.js-choropleth-layer-anchor').on('click', this.revealActiveLayerHandler.bind(this))
        },

        /**
         * Handles the anchor event for showing/revealing layers
         */
        revealActiveLayerHandler(event) {
            event.preventDefault();
            event.stopPropagation();

            // Get name of clicked layer from anchor
            let clickedLayer = $(event.currentTarget).attr('data-layer');
            this.activeLayer = clickedLayer;

            // Hide unclicked layers
            this.customLayers.forEach((layer) => {
                if (layer !== clickedLayer) {
                    this.map.setLayoutProperty(layer, 'visibility', 'none')
                }
            })

            // Double check visibility of layer
            let visibility = this.map.getLayoutProperty(clickedLayer, 'visibility');

            // Hide layer if it wasn't visible before, otherwise reveal it
            if (visibility === 'visible') {
                this.map.setLayoutProperty(clickedLayer, 'visibility', 'none');
            } else {
                this.map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
            }


        },

        /**
         * 
         */
        initSetPropEvent() {
            $('.js-choropleth-prop-anchor').on('click', this.setPropEventHandler.bind(this));
        },

        /**
         * 
         */
        setPropEventHandler(event) {
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
        }
    }

    // console.log($.fn);




    /*------------------------------------*\
      Export 
    \*------------------------------------*/
    module.exports = namespace['pluginName'];

})( jQuery, window , document );