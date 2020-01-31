(function(window) {
  "use strict";
  // make map global in this scope
  let map = undefined;
  let urls = ["./secret", "./json/content.json"];
  Promise.all(urls.map(url => makeRequest('GET', url)))
    .then(texts => {
        let jsons = {
          "secret": texts[0],
          // parse chapters to json object
          "chapters": JSON.parse(texts[1])
        }
        return jsons;
      })
    .then(jsons => {
      mapboxgl.accessToken = jsons.secret;
      map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        bearing: -0,
        center: [121.136147, 23.781723],
        zoom: 5,
        speed: 0.8,
        pitch: 0
      });
      // add a feature element to body
      let features = document.createElement("features");
      features.setAttribute("id", "features");
      document.body.appendChild(features);

      let chapters = jsons.chapters;
      // the first key is active
      let activeChapterName = Object.keys(chapters)[0];
      // On every scroll event, check which element is on screen
      features.onscroll = function() {
        for(let chapterName in chapters) {
          if(isElementOnScreen(chapterName)) {
            activeChapterName = setActiveChapter(chapterName, activeChapterName, chapters);
            break;
          }
        }
      };
      // add sections to features and add markers on the map
      for(let chapterName in chapters) {
        features.appendChild(makeSection(chapterName, chapters[chapterName]["content"]));
        if("markers" in chapters[chapterName]) makeMarkers(chapters[chapterName]["markers"]);
      }
      features.firstChild.setAttribute("class", "active");
    })
    .catch(err => console.log(err));

  function setActiveChapter(chapterName, activeChapterName, chapters) {
    if (chapterName == activeChapterName) return activeChapterName;
    map.flyTo(chapters[chapterName].flyto);
    document.getElementById(chapterName).setAttribute('class', 'active');
    document.getElementById(activeChapterName).setAttribute('class', '');
    return chapterName;
  }

  function isElementOnScreen(id) {
    let element = document.getElementById(id);
    // bounds contains left, top, right, bottom, x, y, width, and height
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
    let bounds = element.getBoundingClientRect();
    // for wide screen
    if(window.innerWidth >= 600) return bounds.top < window.innerHeight && bounds.bottom > window.innerHeight * 0.3;
    // for mobile device
    return bounds.top < window.innerHeight && bounds.bottom > window.innerHeight * 0.85;
  }

  // make sections from the json
  function makeSection(id, content) {
    // id = "..."
    // content = {
    //   "h3": "Credits",
    //   "p": "..."
    // }
    let section = document.createElement("section");
    section.setAttribute("id", id)
    for(let element in content) {
      if(element == "image") {
        let image = new Image(200, 200);
        image.src = content.image;
        section.appendChild(image);
      } else {
        let e = document.createElement(element);
        e.innerHTML = content[element];
        section.append(e);
      }
    }
    return section;
  }

  // set custom markers on the map
  function makeMarkers(markers) {
    // markers = [{
    //   "url": "./images/nicole_llama.png",
    //   "coordinate": [-115.462810, 36.193245],
    //   "msg": "I like sunshine!"
    // }]
    for(let marker of markers) {
      let el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundImage = "url(" + marker.url + ")";
      el.style.width = '50px';
      el.style.height = '50px';
      // add marker to map
      let m = new mapboxgl.Marker(el)
        .setLngLat(marker.coordinate)
        .addTo(map);
      if("msg" in marker) {
        // add popups
        m.setPopup(new mapboxgl.Popup({
            offset: 25,
            closeOnClick: false
          })
          .setHTML('<p>' + marker.msg + '</p>'));
        m.togglePopup();
      }
    }
  }

  // make request function in promise
  // for loading json
  function makeRequest(method, url) {
    return new Promise(function(resolve, reject) {
      let xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.onload = function() {
        if (this.status >= 200 && this.status < 300) {
          resolve(xhr.response);
        } else {
          // If it fails, reject the promise with an error message
          reject({
            url: url,
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function() {
        // Also deal with the case when the entire request fails to begin with
        // This is probably a network error, so reject the promise with an appropriate message
        reject({
          url: url,
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send();
    });
  }
})(this);