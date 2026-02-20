// you may ask: did I just replace every instance of the word 'earthquakes' with the word 'vacancies'?
// yes. yes I did. this is what it has come to.
// if it's any consolation, I did so manually; Ctrl+R is too blunt an instrument here.

// the reason most commented-out code is commented with triple slashes instead of double is for ease of Ctrl-F'ing
// if changes need to be reverted or modified.


// assign the access token
mapboxgl.accessToken = 'REMOVED AT THE BEHEST OF GITHUB SECRET CHECKER';
//say, dontcha think putting this up on a public repo, completely unencrypted, might be bad security practice?

// declare the map object
let map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/dark-v10',
    zoom: 11, // starting zoom
    minZoom: 5,
    ///center: [138, 38] // starting center
    center: [-122.4, 47.6] // seattle. the big apple. rain city. the big easy. city of angels. the emerald city. the big kahuna.
});

// declare the coordinated chart as well as other variables.
let earthquakeChart = null,
    magnitude = {},
    numEarthquakes = 0;

// create a few constant variables.
///const grades = [4, 5, 6],
const grades = [0.05, 0.1, 0.4],//because they're all in percentages
    colors = ['rgb(208,209,230)', 'rgb(103,169,207)', 'rgb(1,108,89)'],
    radii = [5, 15, 20];

// create the legend object and anchor it to the html element with id legend.
const legend = document.getElementById('legend');

//set up legend grades content and labels
let labels = ['<strong>Percentage of Vacant Apartments</strong>'], vbreak;

//iterate through grades and create a scaled circle and label for each
for (var i = 0; i < grades.length; i++) {
    vbreak = grades[i];
    // you need to manually adjust the radius of each dot on the legend 
    // in order to make sure the legend can be properly referred to the dot on the map.
    dot_radii = 2 * radii[i];
    labels.push(
        '<p class="break"><i class="dot" style="background:' + colors[i] + '; width: ' + dot_radii +
            'px; height: ' +
            dot_radii + 'px; "></i> <span class="dot-label" style="top: ' + dot_radii / 2 + 'px;">' + (vbreak * 100) +
            '%</span></p>');

}
const source =
///      '<p style="text-align: right; font-size:10pt">Source: <a href="https://earthquake.usgs.gov/earthquakes/">USGS</a></p>';
      '<p style="text-align: right; font-size:10pt">Source: <a href="https://data.seattle.gov/dataset/Apartment-Market-Vacancy-by-Census-Tract/93bk-qn72/about_data">City of Seattle</a></p>';
      
// join all the labels and the source to create the legend content.
legend.innerHTML = labels.join('') + source;



// define the asynchronous function to load geojson data.
async function geojsonFetch() {

    // Await operator is used to wait for a promise. 
    // An await can cause an async function to pause until a Promise is settled.
    let response;
    ///    response = await fetch('assets/earthquakes.geojson');
    response = await fetch('assets/vacancies.geojson');
    earthquakes = await response.json();///
    ////    vacancies = await response.json(); //I've decided it's too much of a pain to search and replace every instance of the variable 'earthquakes' with 'vacancies', being that 'earthquakes' itself is a substring of way too much unrelated stuff. so we're calling our vacancies variable 'earthquakes' now.



    //load data to the map as new layers.
    //map.on('load', function loadingData() {
    map.on('load', () => { //simplifying the function statement: arrow with brackets to define a function

        // when loading a geojson, there are two steps
        // add a source of the data and then add the layer out of the source
        map.addSource('earthquakes', {
	////map.addSource('vacancies', {
            type: 'geojson',
            data: earthquakes
	    ////data: vacancies
        });


        map.addLayer({
            'id': 'earthquakes-point', //what'd even be the point of renaming this
            'type': 'circle',
	    'source': 'earthquakes',
   	    ////'source': 'vacancies',
            'minzoom': 5,
            'paint': {
                // increase the radii of the circle as mag value increases
                'circle-radius': {
                    ///'property': 'mag',
		    'property': 'VACANCY_RATE',
                    'stops': [
                        [grades[0], radii[0]],
                        [grades[1], radii[1]],
                        [grades[2], radii[2]]
                    ]
                },
                // change the color of the circle as mag value increases
                'circle-color': {
                    ///'property': 'mag',
		    'property': 'VACANCY_RATE',
                    'stops': [
                        [grades[0], colors[0]],
                        [grades[1], colors[1]],
                        [grades[2], colors[2]]
                    ]
                },
                'circle-stroke-color': 'white',
                'circle-stroke-width': 1,
                'circle-opacity': 0.6
            }
        },
		     'waterway-label' // make the thematic layer above the waterway-label layer.
		    );


        // click on each dot to view magnitude in a popup
        map.on('click', 'earthquakes-point', (event) => {
            new mapboxgl.Popup()
                .setLngLat(event.features[0].geometry.coordinates)
                .setHTML(`<strong>Big Chungus:</strong> ${event.features[0].properties.VACANCY_RATE}`)//why not? it's not like anyone's gonna see it 'cuz there's nothing to freakin click on
                .addTo(map);
        });



        // the coordinated chart relevant operations

        // found the the magnitudes of all the earthquakes in the displayed map view.        
        magnitudes = calEarthquakes(earthquakes, map.getBounds());
        
        // enumerate the number of earthquakes.
        numEarthquakes = magnitudes[4] + magnitudes[5] + magnitudes[6];

        // update the content of the element earthquake-count.
        document.getElementById("earthquake-count").innerHTML = numEarthquakes;

        // add "mag" to the beginning of the x variable - the magnitude, and "#" to the beginning of the y variable - the number of earthquake of similar magnitude.
        x = Object.keys(magnitudes);
        x.unshift("mag")
        y = Object.values(magnitudes);
        y.unshift("#")


        // generate the chart
        earthquakeChart = c3.generate({
            size: {
                height: 350,
                width: 460
            },
            data: {
		///                x: 'mag',
		x: 'VACANCY_RATE',
                columns: [x, y],
                type: 'bar', // make a bar chart.
                colors: {
                    '#': (d) => {
                        return colors[d["x"]];
                    }
                },
                onclick: function (d) { // update the map and sidebar once the bar is clicked.
                    let floor = parseInt(x[1 + d["x"]]),
                        ceiling = floor + 1;
                    // combine two filters, the first is ['>=', 'mag', floor], the second is ['<', 'mag', ceiling]
                    // the first indicates all the earthquakes with magnitude greater than floor, the second indicates
                    // all the earthquakes with magnitude smaller than the ceiling.
                    map.setFilter('earthquakes-point',
                        ['all',
                            ['>=', 'VACANCY_RATE', floor],
                            ['<', 'VACANCY_RATE', ceiling]
                        ]);
                }
            },
            axis: {
                x: { //magnitude
                    type: 'category',
                },
                y: { //count
                    tick: {
                        values: [10, 20, 30, 40]
                    }
                }
            },
            legend: {
                show: false
            },
            bindto: "#earthquake-chart" //bind the chart to the place holder element "earthquake-chart".
        });

    });



    //load data to the map as new layers.
    //map.on('load', function loadingData() {
    map.on('idle', () => { //simplifying the function statement: arrow with brackets to define a function

        magnitudes = calEarthquakes(earthquakes, map.getBounds());
        numEarthquakes = magnitudes[4] + magnitudes[5] + magnitudes[6];
        document.getElementById("earthquake-count").innerHTML = numEarthquakes;


        x = Object.keys(magnitudes);
        x.unshift("mag") // wtf does this even do
        y = Object.values(magnitudes);
        y.unshift("#")

        // after finishing each map reaction, the chart will be rendered in case the current bbox changes.
        earthquakeChart.load({
            columns: [x, y]
        });
    });
}

// call the geojson loading function
geojsonFetch();

function calEarthquakes(currentEarthquakes, currentMapBounds) {

    let magnitudesClasses = {
        4: 0,
        5: 0,
        6: 0
    };
    currentEarthquakes.features.forEach(function (d) { // d indicate a feature of currentEarthquakes
        // contains is a spatial operation to determine whether a point within a bbox or not.
        if (currentMapBounds.contains(d.geometry.coordinates)) {
            // if within, the # of the earthquake in the same magnitude increase by 1.
            magnitudesClasses[Math.floor(d.properties.mag)] += 1;
        }

    })
    return magnitudesClasses;
}

// capture the element reset and add a click event to it.
const reset = document.getElementById('reset');
reset.addEventListener('click', event => {

    // this event will trigger the map fly to its origin location and zoom level.
    map.flyTo({
        zoom: 11,
        ///center: [138, 38] // it's bad to hardcode this stuff, dontcha know.
	center: [-122.4, 47.6]
    });
    // also remove all the applied filters
    map.setFilter('earthquakes-point', null)


});
