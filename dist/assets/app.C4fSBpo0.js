(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))o(t);new MutationObserver(t=>{for(const n of t)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function a(t){const n={};return t.integrity&&(n.integrity=t.integrity),t.referrerPolicy&&(n.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?n.credentials="include":t.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function o(t){if(t.ep)return;t.ep=!0;const n=a(t);fetch(t.href,n)}})();function h(){if(typeof window>"u"||!window.localStorage)return!1;try{const l="__storage_test__";return window.localStorage.setItem(l,l),window.localStorage.removeItem(l),!0}catch{return!1}}function w(l,e){try{h()?window.localStorage.setItem(l,e):(console.warn("[storage] localStorage unavailable; using fallback memory."),window.__fallbackStorage=window.__fallbackStorage||{},window.__fallbackStorage[l]=e)}catch(a){console.warn("[storage] localStorage blocked:",a),window.__fallbackStorage=window.__fallbackStorage||{},window.__fallbackStorage[l]=e}}function c(l){var e,a;try{return h()?window.localStorage.getItem(l):((e=window.__fallbackStorage)==null?void 0:e[l])||null}catch(o){return console.warn("[storage] localStorage blocked:",o),((a=window.__fallbackStorage)==null?void 0:a[l])||null}}class g{constructor(){this.modal=null,this.defaultSettings={alerts:{highTemp:90,lowTemp:32,windSpeed:20,rainAmount:5,snowAmount:2},display:{showTrends:!0,showAlerts:!0,temperature:"F",refreshInterval:30}},this.loadSettings()}loadSettings(){const e=c("settings");e?this.settings=JSON.parse(e):this.settings={...this.defaultSettings}}saveSettings(e){this.settings={...this.settings,...e},w("settings",JSON.stringify(this.settings))}createSettingsModal(){const e=document.createElement("div");return e.className="settings-modal",e.innerHTML=`
      <div class="settings-content">
        <h2>Weather Settings</h2>

        <div class="settings-section">
          <h3>Alert Thresholds</h3>
          <div class="setting-item">
            <label>High Temperature Alert (°F)</label>
            <input type="number" id="highTemp" value="${this.settings.alerts.highTemp}">
          </div>
          <div class="setting-item">
            <label>Low Temperature Alert (°F)</label>
            <input type="number" id="lowTemp" value="${this.settings.alerts.lowTemp}">
          </div>
          <div class="setting-item">
            <label>Wind Speed Alert (mph)</label>
            <input type="number" id="windSpeed" value="${this.settings.alerts.windSpeed}">
          </div>
        </div>

        <div class="settings-section">
          <h3>Display Options</h3>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="showTrends"
                ${this.settings.display.showTrends?"checked":""}>
              Show Weather Trends
            </label>
          </div>
          <div class="setting-item">
            <label>Temperature Unit</label>
            <select id="tempUnit">
              <option value="F" ${this.settings.display.temperature==="F"?"selected":""}>Fahrenheit</option>
              <option value="C" ${this.settings.display.temperature==="C"?"selected":""}>Celsius</option>
            </select>
          </div>
        </div>

        <div class="button-group">
          <button id="saveSettings" class="primary save-btn">Save Settings</button>
          <button id="closeSettings" class="cancel-btn">Cancel</button>
        </div>
      </div>
    `,e}openModal(){this.modal&&this.closeModal(),this.modal=this.createSettingsModal(),document.body.appendChild(this.modal);const e=this.modal.querySelector("#saveSettings"),a=this.modal.querySelector("#closeSettings");e.addEventListener("click",()=>this.saveAndClose()),a.addEventListener("click",()=>this.closeModal()),this.modal.addEventListener("click",o=>{o.target===this.modal&&this.closeModal()})}closeModal(){this.modal&&(this.modal.remove(),this.modal=null)}saveAndClose(){const e=this.modal,a={alerts:{highTemp:parseInt(e.querySelector("#highTemp").value),lowTemp:parseInt(e.querySelector("#lowTemp").value),windSpeed:parseInt(e.querySelector("#windSpeed").value),rainAmount:this.settings.alerts.rainAmount,snowAmount:this.settings.alerts.snowAmount},display:{showTrends:e.querySelector("#showTrends").checked,showAlerts:this.settings.display.showAlerts,temperature:e.querySelector("#tempUnit").value,refreshInterval:this.settings.display.refreshInterval}};this.saveSettings(a),this.closeModal(),window.dispatchEvent(new Event("settingsChanged"))}}let u="";function v(){if(!u)throw new Error("OpenWeather API key not found in environment variables")}class S{constructor(){this.nflStadiums=[],this.ncaaStadiums=[],this.mlbStadiums=[],this.mlsStadiums=[],this.init()}async init(){try{const e=c("openweatherApiKey");e&&(u=e),c("darkModeEnabled")==="true"&&document.body.classList.add("dark-mode"),this.setupEventListeners(),await this.loadFootballStadiumData(),await this.loadBaseballSoccerData()}catch(e){console.error("Initialization error:",e),this.showError("Initialization Error",e.message)}}setupEventListeners(){const e=document.querySelector("#refresh");e&&(e.onclick=()=>this.refreshWeather());const a=document.querySelector("#weather-date");a&&(a.onchange=()=>this.refreshWeather());const o=document.querySelector("#settings");o&&(o.onclick=()=>this.openSettings());const t=document.querySelector("#nflDropdown"),n=document.querySelector("#ncaaDropdown"),i=document.querySelector("#mlbDropdown"),s=document.querySelector("#mlsDropdown");t&&t.addEventListener("change",()=>{n&&(n.value="all"),i&&(i.value="all"),s&&(s.value="all"),this.refreshWeather()}),n&&n.addEventListener("change",()=>{t&&(t.value="all"),i&&(i.value="all"),s&&(s.value="all"),this.refreshWeather()}),i&&i.addEventListener("change",()=>{t&&(t.value="all"),n&&(n.value="all"),s&&(s.value="all"),this.refreshWeather()}),s&&s.addEventListener("change",()=>{t&&(t.value="all"),n&&(n.value="all"),i&&(i.value="all"),this.refreshWeather()})}async loadFootballStadiumData(){try{const e=await fetch("/data/stadium_coordinates.json");if(!e.ok)throw new Error("Failed to load stadium data");const a=await e.json();this.nflStadiums=Object.entries(a.nfl).map(([o,t])=>({name:o,team:t.team,latitude:t.latitude,longitude:t.longitude})),this.ncaaStadiums=Object.entries(a.ncaa).map(([o,t])=>({name:o,team:t.team,latitude:t.latitude,longitude:t.longitude})),this.populateNflDropdown(),this.populateNcaaDropdown()}catch(e){console.error("Error loading football data:",e),this.showError("Could not load football data","Check connection")}}async loadBaseballSoccerData(){try{const e=await fetch("/data/more_stadium_coordinates.json");if(!e.ok)throw new Error("Failed to load MLB/MLS data");const a=await e.json();this.mlbStadiums=Object.entries(a.mlb).map(([o,t])=>({name:o,team:t.team,latitude:t.latitude,longitude:t.longitude})),this.mlsStadiums=Object.entries(a.mls).map(([o,t])=>({name:o,team:t.team,latitude:t.latitude,longitude:t.longitude})),this.populateMlbDropdown(),this.populateMlsDropdown()}catch(e){console.error("Error loading baseball/soccer data:",e),this.showError("Could not load MLB/MLS data","Check connection")}}populateNflDropdown(){const e=document.querySelector("#nflDropdown");e&&(e.innerHTML=`
      <option value="all">All NFL Stadiums</option>
      ${this.nflStadiums.map(a=>`<option value="${a.team}">${a.name} - ${a.team}</option>`).join("")}
    `)}populateNcaaDropdown(){const e=document.querySelector("#ncaaDropdown");e&&(e.innerHTML=`
      <option value="all">All NCAA Stadiums</option>
      ${this.ncaaStadiums.map(a=>`<option value="${a.team}">${a.name} - ${a.team}</option>`).join("")}
    `)}populateMlbDropdown(){const e=document.querySelector("#mlbDropdown");e&&(e.innerHTML=`
      <option value="all">All MLB Stadiums</option>
      ${this.mlbStadiums.map(a=>`<option value="${a.team}">${a.name} - ${a.team}</option>`).join("")}
    `)}populateMlsDropdown(){const e=document.querySelector("#mlsDropdown");e&&(e.innerHTML=`
      <option value="all">All MLS Stadiums</option>
      ${this.mlsStadiums.map(a=>`<option value="${a.team}">${a.name} - ${a.team}</option>`).join("")}
    `)}async refreshWeather(){const e=document.getElementById("weatherList");if(!e)return;e.innerHTML='<div class="loading">Loading weather data...</div>';const a=document.querySelector("#weather-date"),o=(a==null?void 0:a.value)||new Date().toISOString().split("T")[0],t=document.querySelector("#nflDropdown").value,n=document.querySelector("#ncaaDropdown").value,i=document.querySelector("#mlbDropdown").value,s=document.querySelector("#mlsDropdown").value,r=[];if(t!=="all"&&r.push(...this.nflStadiums.filter(d=>d.team===t)),n!=="all"&&r.push(...this.ncaaStadiums.filter(d=>d.team===n)),i!=="all"&&r.push(...this.mlbStadiums.filter(d=>d.team===i)),s!=="all"&&r.push(...this.mlsStadiums.filter(d=>d.team===s)),r.length===0){e.innerHTML='<p class="text-center">No stadium selected.</p>';return}try{v();const d=r.map(f=>this.fetchWeatherForStadium(f,o)),p=await Promise.all(d);this.displayWeather(p)}catch(d){console.error("Error in refreshWeather:",d),this.showError("Could not fetch weather data")}}async fetchWeatherForStadium(e,a){const o=`https://api.openweathermap.org/data/2.5/weather?lat=${e.latitude}&lon=${e.longitude}&units=imperial&appid=${u}`,t=await fetch(o);if(!t.ok)throw new Error(`Weather fetch error: ${t.statusText}`);const n=await t.json();return{stadium:e,weather:n}}displayWeather(e){const a=document.getElementById("weatherList");a&&(a.innerHTML="",e.forEach(o=>{const{stadium:t,weather:n}=o,s=`https://openweathermap.org/img/wn/${n.weather[0].icon}@2x.png`,r=document.createElement("div");r.className="weather-card bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col gap-2 w-full text-black dark:text-white",r.innerHTML=`
        <div class="text-lg font-bold">${t.name}</div>
        <div class="text-sm mb-1">${t.team}</div>
        <div class="flex flex-row items-center justify-between">
          <div>
            <div class="text-xl font-bold mb-1">
              ${Math.round(n.main.temp)}°F
            </div>
            <div class="conditions text-sm mb-1">
              <p>${n.weather[0].main}</p>
              <p>Feels like: ${Math.round(n.main.feels_like)}°F</p>
            </div>
            <div class="details text-sm">
              <p>Humidity: ${n.main.humidity}%</p>
              <p>Wind: ${Math.round(n.wind.speed)} mph</p>
            </div>
          </div>
          <div>
            <img
              src="${s}"
              alt="${n.weather[0].description}"
              class="w-12 h-12"
            />
          </div>
        </div>
      `,a.appendChild(r)}))}showError(e,a,o=!1){const t=document.getElementById("weatherList");if(!t)return;t.innerHTML="";const n=document.createElement("div");n.className=`error-message ${o?"api-key-missing":""}`;const i=document.createElement("strong");if(i.textContent=e,n.appendChild(i),a){const r=document.createElement("p");r.textContent=a,n.appendChild(r)}const s=document.createElement("button");s.textContent=o?"Configure API Key":"Try Again",s.addEventListener("click",()=>{o?this.openSettings():window.location.reload()}),n.appendChild(s),t.appendChild(n)}openSettings(){new g().openModal()}}function m(){new S}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",m):m();
