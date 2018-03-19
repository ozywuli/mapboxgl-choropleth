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
            layers: [
                {
                    id: "states-layer",
                    source: {
                        id: 'states',
                        type: 'geojson',
                        data: 'data/stateData.geojson'
                    },
                    scale: {
                        colors: ['#FFEDA0','#BD0026'],
                        step: [10, 20, 50, 100, 200, 500, 1000],
                        property: 'density'
                    }
                },
                {
                    id: "alabama-layer",
                    source: {
                        id: 'alabama',
                        type: 'geojson',
                        data: 'data/alabama.geojson'
                    },
                    scale: {
                        colors: ['blue', 'red'],
                        step: [0, 500000, 1000000],
                        property: 'population'
                    }
                }
            ]
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

        mapLoaded(resolve) {
            // Resolve map load promise
            resolve();

            // Add map layers
            this.addMapLayers();
        },

        afterMapLoaded(map) {
            this.initFeatureClickEvent();

            $('.sidebar .layers a').on('click', (e) => {
                var clickedLayer = $(e.currentTarget).attr('class');
                e.preventDefault();
                e.stopPropagation();

                console.log(clickedLayer);

                var visibility = this.map.getLayoutProperty(clickedLayer, 'visibility');

                if (visibility === 'visible') {
                    this.map.setLayoutProperty(clickedLayer, 'visibility', 'none');
                } else {
                    this.map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
                }
            })

            $('.sidebar .props a').on('click', (e) => {
                var clickedLayer = $(e.currentTarget).attr('class');
                e.preventDefault();
                e.stopPropagation();

                // console.log(this.map.getSource('alabama'));
                // console.log(this.map.getLayer('alabama-layer'));
                this.map.setPaintProperty('alabama-layer', 'fill-color', [
                    'step',
                    ['get', 'density'],
                    'white',
                    50, 'blue',
                    100, 'red'
                ]);
            })
        },

        addMapLayers() {
            this.options.mapConfig.layers.forEach((item, index) => {
                // console.log(item);

                // Add map source
                this.map.addSource(item.source.id, {
                    type: item.source.type,
                    data: item.source.data
                });

                // Configure the paint layer
                let paintLayer = () => {
                    let fillColorArray = [
                        'step',
                        ['get', item.scale.property]
                    ];

                    let scaleStep = item.scale.step;

                    chroma.scale(item.scale.colors).mode('lch').colors(scaleStep.length).map((color, index) => {
                        if (index > 0) {
                            fillColorArray.push(scaleStep[index])    
                        }

                        fillColorArray.push(color);
                    })

                    return {
                        "fill-color": fillColorArray,
                        "fill-opacity": 0.8
                    }
                }

                console.log(paintLayer());

                // Add layers to map
                this.map.addLayer({
                    "id": item.id,
                    "type": "fill",
                    "source": item.source.id,
                    "paint": paintLayer(),
                    'layout': {
                        'visibility': 'none'
                    }
                });
            });

        },

        initFeatureClickEvent() {
            this.map.on('click', 'states-join', this.featureClickEventHandler.bind(this));
        },

        featureClickEventHandler(event) {
            this.options.featureClickEventCallback(event);
        },

        revealActiveLayer() {

        }
    }

    // console.log($.fn);




    /*------------------------------------*\
      Export 
    \*------------------------------------*/
    module.exports = namespace['pluginName'];

})( jQuery, window , document );