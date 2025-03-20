// Pastikan dark mode diterapkan sebelum halaman selesai dimuat
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
}
if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("dark-light");
}

document.addEventListener("DOMContentLoaded", () => {
    const darkModeToggle = document.getElementById("darkModeToggle");

    if (darkModeToggle) { 
        updateDarkModeText();

        darkModeToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
            updateDarkModeText();
        });

        function updateDarkModeText() {
            darkModeToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️ Light Mode" : "🌙 Dark Mode";
        }
    }
});

document.addEventListener("DOMContentLoaded", function () {
    let map = L.map("map").setView([-6.2, 106.8], 8); // Fokus Jabodetabek

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const overpassURL = "https://overpass-api.de/api/interpreter?data=[out:json];area[name='Indonesia']->.searchArea;node[place=city](area.searchArea);out body;";
    const API_KEY = "ebeed99cd6b48352766114c4ce184ad6fb952821";

    let cityList = document.getElementById("cityList");
    let citiesData = [];

    function getAQI(city, coords) {
        let url = `https://api.waqi.info/feed/geo:${coords[0]};${coords[1]}/?token=${API_KEY}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.status === "ok") {
                    let aqi = data.data.aqi;
                    let category = getAQICategory(aqi);
                    let color = getAQIColor(aqi);

                    let lastUpdated = new Date(data.data.time.v * 1000);
                    let formattedTime = isNaN(lastUpdated.getTime()) 
                        ? "Tidak tersedia" 
                        : lastUpdated.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

                    let marker = L.circleMarker(coords, {
                        radius: 8,
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.7
                    }).addTo(map);

                    marker.bindPopup(() => {
                        let chartId = `chart-${city.replace(/\s+/g, "-")}`;
                        return `<b>${city}</b><br>AQI: ${aqi} (${category})<br>
                                <small>Terakhir diperbarui: ${formattedTime}</small><br>
                                <canvas id="${chartId}" width="200" height="100"></canvas>`;
                    });

                    marker.on("popupopen", function () {
                        setTimeout(() => renderChart(city, generateRandomAQI()), 300);
                    });

                    let listItem = document.createElement("li");
                    listItem.innerText = `${city} (AQI: ${aqi})`;
                    listItem.style.cursor = "pointer";
                    listItem.style.color = color;
                    listItem.addEventListener("click", () => map.setView(coords, 12));

                    if (cityList) {
                        cityList.appendChild(listItem);
                    } else {
                        console.error("Elemen cityList tidak ditemukan di DOM.");
                    }

                    citiesData.push({ name: city, coords });
                }
            })
            .catch(error => console.error(`Error mengambil data AQI untuk ${city}:`, error));
    }

    function getAQICategory(aqi) {
        if (aqi <= 50) return "Baik";
        if (aqi <= 100) return "Sedang";
        if (aqi <= 150) return "Tidak Sehat bagi Kelompok Sensitif";
        if (aqi <= 200) return "Tidak Sehat";
        if (aqi <= 300) return "Sangat Tidak Sehat";
        return "Berbahaya";
    }

    function getAQIColor(aqi) {
        if (aqi <= 50) return "green";
        if (aqi <= 100) return "yellow";
        if (aqi <= 150) return "orange";
        if (aqi <= 200) return "red";
        if (aqi <= 300) return "purple";
        return "maroon";
    }

    function renderChart(city, aqiData) {
        let chartId = `chart-${city.replace(/\s+/g, "-")}`;
        let ctx = document.getElementById(chartId);
        if (ctx) {
            new Chart(ctx, {
                type: "line",
                data: {
                    labels: ["-6", "-5", "-4", "-3", "-2", "-1", "Hari Ini"],
                    datasets: [{
                        label: "AQI",
                        data: aqiData,
                        borderColor: "blue",
                        backgroundColor: "rgba(0, 0, 255, 0.2)",
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: { responsive: false, scales: { y: { beginAtZero: true } } }
            });
        }
    }

    function generateRandomAQI() {
        return Array.from({ length: 7 }, () => Math.floor(Math.random() * 200));
    }

    function updateAQI() {
        cityList.innerHTML = "";
        citiesData = [];
        fetch(overpassURL)
            .then(response => response.json())
            .then(data => {
                data.elements.forEach(city => {
                    let name = city.tags.name;
                    let coords = [city.lat, city.lon];
                    getAQI(name, coords);
                });
            })
            .catch(error => console.error("Error mengambil data kota dari Overpass API:", error));
    }

    updateAQI();
    setInterval(updateAQI, 300000);

    document.getElementById("menuToggle").addEventListener("click", () => {
        document.getElementById("sidebar").classList.toggle("sidebar-open");
    });

    // Fitur Pencarian Lokasi
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");

    searchButton.addEventListener("click", () => {
        let query = searchInput.value.toLowerCase();
        let foundCity = citiesData.find(city => city.name.toLowerCase().includes(query));

        if (foundCity) {
            map.setView(foundCity.coords, 12);
        } else {
            alert("Kota tidak ditemukan dalam daftar.");
        }
    });

    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            searchButton.click();
        }
    });
});
