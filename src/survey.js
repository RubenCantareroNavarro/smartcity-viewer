$(".menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});

mapboxgl.accessToken = 'pk.eyJ1IjoicnViZW5jbjkwIiwiYSI6ImNrYWdudzluOTA1Zm0zMW1vcGxiZDFpN3gifQ.Gi7bav34XZCKoS9SczeeDg';
var ciudad_real = [-3.927374, 38.985531];
var api_base_url = "https://pike.esi.uclm.es:7167"
var goal_file = "https://pike.esi.uclm.es:7166/assets/linea-de-meta.png"
    // var api_base_url = "http://0.0.0.0:8081"
    // var goal_file = "http://0.0.0.0:8080/assets/linea-de-meta.png"
var markers = Array();
var routes_geometry = Array();
var cases;
var active_case = {
    case_id: "",
    origin: "",
    destiny: "",
    context: "",
};

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/rubencn90/ckfwo9gop092p19uektbw5mz3/draft',
    center: ciudad_real,
    zoom: 14
});

map.on('load', function() {
    map.addSource('route', {
        'type': 'geojson',
        lineMetrics: true,
        'data': {
            'type': 'FeatureCollection',
            'features': []
        }
    });

    map.addLayer({
        'id': 'route_layer',
        'type': 'line',
        'source': 'route',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#ff004c',
            'line-width': 6,
            'line-gradient': [
                'interpolate', ['linear'],
                ['line-progress'],
                0,
                '#8800ff',
                0.125,
                '#5100ff',
                0.250,
                '#000dff',
                0.375,
                '#0066ff',
                0.5,
                '#00a2ff',
                0.625,
                '#00e5ff',
                0.750,
                '#00fff7',
                0.875,
                '#00ffc3',
                1,
                '#05ff93'
            ]
        }
    });


    map.loadImage(
        goal_file,
        function(error, image) {
            if (error) throw error;
            map.addImage('goal', image);
            map.addSource('goal_source', {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': [{
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': []
                        }
                    }]
                }
            });
            map.addLayer({
                'id': 'goal_layer',
                'type': 'symbol',
                'source': 'goal_source',
                'layout': {
                    'icon-image': 'goal',
                    'icon-size': 0.07
                }
            });
        }
    );

    init_options();
});

function init_options() {
    $.ajax({
        type: "GET",
        url: api_base_url + "/covid19-routes/api/v1.0/ciudad-real/survey/get-cases/",

        success: function(response) {
            cases = response
            for (var case_id in cases) {
                createNewOption(case_id, cases[case_id].name);
            }
        }
    });
}

function createNewOption(id, label_text) {
    var option = document.createElement('option');
    option.id = id;
    option.value = id;
    option.innerHTML = label_text;

    var select = document.getElementById('inputGroupSelectCase');
    select.appendChild(option);
}

function case_selected() {
    select = document.getElementById("inputGroupSelectCase");

    if (select.value != -1) {
        active_case.case_id = select.value;
        active_case.origin = cases[select.value].origin;
        active_case.destiny = cases[select.value].destiny;
        active_case.context = cases[select.value].context;

        init_case();
    }
}

function clean_elements() {
    markers.forEach(element => element.remove());

    map.getSource("route").setData({
        'type': 'FeatureCollection',
        'features': []
    });

    markers = Array();
    routes_geometry = Array();
}

function init_case() {
    clean_elements();
    init_context();
    initial_marker = new mapboxgl.Marker({
            draggable: false,
            color: '#ff004c'
        })
        .setLngLat(active_case.origin)
        .addTo(map);

    markers.push(initial_marker);

    map.getSource("goal_source").setData({
        'type': 'FeatureCollection',
        'features': [{
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': active_case.destiny
            }
        }]
    });
}

function init_context(){
    
    list_item = document.getElementById("context-explication");
    list_item.innerHTML = `Imagine that you want to go from the origin to the destination indicated on the map considering that it is ${active_case.context["time"]} on a ${active_case.context["week-day"]} in ${active_case.context["month"]}. ${active_case.context["is-public-holiday"]=="Yes" ? "It is" : "It is not"} a local holiday in the city.<br> <br> <b><i>You should consider that we are in the Covid-19 pandemic, so the route must be the safest from your point of view.</i></b>`;

    list_item = document.getElementById("list-item-hour");
    list_item.innerHTML = `<b>Time:</b> ${active_case.context["time"]}`;

    list_item = document.getElementById("list-item-week-day");
    list_item.innerHTML = `<b>Week-day:</b> ${active_case.context["week-day"]}`;

    list_item = document.getElementById("list-item-month");
    list_item.innerHTML = `<b>Month:</b> ${active_case.context["month"]}`;

    list_item = document.getElementById("list-item-is-public-holiday");
    list_item.innerHTML = `<b>Public holiday:</b> ${active_case.context["is-public-holiday"]}`;
}

function addMarker() {
    marker = new mapboxgl.Marker({
            draggable: true,
            color: '#00f7da'
        })
        .setPopup(new mapboxgl.Popup().setHTML(markers.length))
        .setLngLat(map.getCenter())
        .addTo(map);

    marker.on('dragend', updateRoute);
    markers.push(marker);
    updateRoute();
}

function updateRoute() {
    for (var i = markers.length - 1; i > 0; i--) {
        var destination = markers[i].getLngLat();
        var origin = markers[i - 1].getLngLat();

        showRoute('route', 'danger', origin.lat, origin.lng, destination.lat, destination.lng, i);
    }
}

function showRoute(source, route_type, origin_lat, origin_lon, destination_lat, destination_lon, index) {
    $.ajax({
        type: "GET",
        url: api_base_url + "/covid19-routes/api/v1.0/ciudad-real/route/",
        data: {
            route_type: route_type,
            origin_lat: origin_lat,
            origin_lon: origin_lon,
            destination_lat: destination_lat,
            destination_lon: destination_lon
        },
        success: function(response) {
            data = prepareJSONLine(response.geometry.coordinates, index);
            map.getSource(source).setData(data);
        }
    });
}

function prepareJSONLine(new_coordinates, index) {
    if (routes_geometry.length == index - 1) {
        routes_geometry.push(new_coordinates);
    } else {
        routes_geometry[index - 1] = new_coordinates;
    }

    data = {
        'type': 'Feature',
        'properties': {},
        'geometry': {
            'type': 'LineString',
            'coordinates': preparePoints()
        }
    };
    return data;
}

function preparePoints() {
    coordinates = Array();
    routes_geometry.forEach(element => {
        element.forEach(element2 => {
            coordinates.push(element2);
        });
    });
    return coordinates;
}

function sendResult() {
    selectCase = document.getElementById("inputGroupSelectCase");
    selectCityKnow = document.getElementById("inputGroupSelectCityKnow");
    selectAge = document.getElementById("inputGroupSelectAge");
    selectGender = document.getElementById("inputGroupSelectGender");

    if (routes_geometry.length == 0) {
        alert("The route is empty. Please, add markers from origin to destination.");
        return
    } else if (selectCase.options[selectCase.value].disabled == true) {
        alert("You have already done this case. Select a different one");
        return
    }else if(selectCityKnow.value == -1){
        alert("You must indicate how much you know the city");
        return
    }else if(selectAge.value == -1){
        alert("You must indicate your age");
        return
    }else if(selectGender.value == -1){
        alert("You must indicate your gender");
        return
    }

    if (confirm("Are you sure?")) {
        var data = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": preparePoints()
            },
            "properties": {
                "case_id": active_case.case_id,
                "knowledge_city_level": selectCityKnow.value,
                "age": selectAge.value,
                "gender": selectGender.value,
                "context": active_case.context,
                "origin": active_case.origin,
                "destiny": active_case.destiny
            }
        }

        $.ajax({
            url: api_base_url + '/covid19-routes/api/v1.0/ciudad-real/survey/',
            data: JSON.stringify(data),
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            success: function(response) {
                alert("The case is complete. You can select a different one.");
                select.options[select.value].disabled = true;
            },
            error: function(error) {
                console.log("Error sending data");
            }
        });
    }
}