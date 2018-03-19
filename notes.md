// function getColor(d) {
//     return d > 1000 ? '#800026' :
//            d > 500  ? '#BD0026' :
//            d > 200  ? '#E31A1C' :
//            d > 100  ? '#FC4E2A' :
//            d > 50   ? '#FD8D3C' :
//            d > 20   ? '#FEB24C' :
//            d > 10   ? '#FED976' :
//                       '#FFEDA0';
// }



// map.addLayer({
//     "id": "states-join",
//     "type": "fill",
//     "source": "states",
//     "paint": {
//         "fill-color": [
//             'step',
//             ["get", "density"],
//             "#FFEDA0",
//             10, "#FFEDA0",
//             20, "#FED976",
//             50, "#FEB24C",
//             100, "#FD8D3C",
//             200, "#FC4E2A",
//             500, "#E31A1C"
//         ],
//         "fill-opacity": 0.8
//     }
// });

// this.map.addLayer({
//     "id": "states-join",
//     "type": "fill",
//     "source": "states",
//     "paint": {
//         "fill-color": [
//             'interpolate',
//             ['linear'],
//             ['get', 'density'],
//             10, "#FFEDA0",
//             20, "#FED976",
//             50, "#FEB24C",
//             100, "#FD8D3C",
//             200, "#FC4E2A",
//             500, "#E31A1C",
//             1000, "#BD0026"
//         ],
//         "fill-opacity": 0.8
//     }
// });