# more_stadium_scraper.py

import requests
from bs4 import BeautifulSoup
import json
import time
from urllib.parse import quote
from datetime import datetime
import logging
from typing import Dict, Optional
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('more_stadium_scraper.log'),
        logging.StreamHandler()
    ]
)

class MoreStadiumScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'StadiumCoordinateCollector/1.0 (Educational Purpose)'
        })
        self.rate_limit_delay = 1.1  # Slightly over 1 second

    def scrape_stadium_coordinates(self) -> Dict:
        """
        Scrape MLB and MLS stadiums. Return a dict of the form:
        {
          'metadata': {...},
          'mlb': {},
          'mls': {}
        }
        """
        stadiums = {
            'metadata': {
                'last_updated': datetime.now().isoformat(),
                'version': '1.0'
            },
            'mlb': {},
            'mls': {}
        }
        
        # Scrape MLB stadiums
        logging.info("Starting MLB stadium scraping...")
        self._scrape_mlb_stadiums(stadiums)
        
        # Scrape MLS stadiums
        logging.info("Starting MLS stadium scraping...")
        self._scrape_mls_stadiums(stadiums)

        return stadiums

    def _scrape_mlb_stadiums(self, stadiums: Dict) -> None:
        """
        Scrape from: https://en.wikipedia.org/wiki/List_of_current_Major_League_Baseball_stadiums
        Table columns:
          0: Image
          1: Name
          2: Capacity
          3: Location
          4: Surface
          5: Team
          ...
        We'll use columns 1 (Name), 3 (Location), 5 (Team).
        """
        mlb_url = "https://en.wikipedia.org/wiki/List_of_current_Major_League_Baseball_stadiums"
        try:
            response = self.session.get(mlb_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            tables = soup.find_all('table', {'class': 'wikitable'})
            target_table = None
            
            for t in tables:
                # We want the table with 'Name' and 'Team' in the header
                if 'Name' in str(t) and 'Team' in str(t):
                    target_table = t
                    break

            if not target_table:
                raise ValueError("MLB stadium table not found on the page")

            rows = target_table.find_all('tr')
            data_rows = rows[1:]  # skip header row
            logging.info(f"Found {len(data_rows)} MLB stadium rows.")

            for idx, row in enumerate(data_rows, start=1):
                cells = row.find_all(['th', 'td'])
                if len(cells) >= 6:
                    stadium_name = cells[1].get_text(strip=True)
                    location_raw = cells[3].get_text(strip=True)
                    team = cells[5].get_text(strip=True)

                    logging.info(f"MLB row {idx}: stadium={stadium_name}, team={team}, location={location_raw}")

                    if stadium_name and team and location_raw:
                        self._process_mlb_stadium([stadium_name, team, location_raw], stadiums)
                        time.sleep(self.rate_limit_delay)

        except Exception as e:
            logging.error(f"Error scraping MLB stadiums: {e}")
            raise

    def _process_mlb_stadium(self, data, stadiums: Dict) -> None:
        """
        data = [stadium_name, team, location].
        We'll store it in stadiums['mlb'][stadium_name].
        """
        try:
            stadium_name, team, location = data
            # Clean up
            stadium_name = self._clean_stadium_data(stadium_name)
            team = self._clean_stadium_data(team)
            location = self._clean_stadium_data(location)

            logging.info(f"Geocoding MLB stadium: {stadium_name} in {location}")
            coords = self._geocode_location(f"{stadium_name}, {location}")
            if not coords:
                coords = self._geocode_location(location)

            if coords:
                stadiums['mlb'][stadium_name] = {
                    'location': location,
                    'team': team,
                    'latitude': coords['lat'],
                    'longitude': coords['lon'],
                    'display_name': coords.get('display_name', ''),
                    'type': coords.get('type', ''),
                    'last_verified': datetime.now().isoformat()
                }
            else:
                logging.error(f"Failed to geocode MLB stadium: {stadium_name}")
        except Exception as e:
            logging.error(f"Error processing MLB stadium: {e}")

    def _scrape_mls_stadiums(self, stadiums: Dict) -> None:
        """
        Scrape from: https://en.wikipedia.org/wiki/List_of_Major_League_Soccer_stadiums
        Table columns (based on your screenshot):
          0: Image
          1: Stadium
          2: Team
          3: Location
          ...
        We'll use columns 1 (Stadium), 2 (Team), 3 (Location).
        """
        mls_url = "https://en.wikipedia.org/wiki/List_of_Major_League_Soccer_stadiums"
        try:
            response = self.session.get(mls_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            tables = soup.find_all('table', {'class': 'wikitable'})
            target_table = None

            for t in tables:
                if 'Stadium' in str(t) and 'Team' in str(t) and 'Location' in str(t):
                    target_table = t
                    break

            if not target_table:
                logging.warning("MLS stadium table not found on the page.")
                return

            rows = target_table.find_all('tr')
            data_rows = rows[1:]  # skip header row
            logging.info(f"Found {len(data_rows)} MLS stadium rows.")

            for idx, row in enumerate(data_rows, start=1):
                cells = row.find_all(['th', 'td'])
                # Expecting columns: 1 (Stadium), 2 (Team), 3 (Location)
                if len(cells) >= 4:
                    stadium_name = cells[1].get_text(strip=True)
                    team = cells[2].get_text(strip=True)
                    location_raw = cells[3].get_text(strip=True)

                    logging.info(f"MLS row {idx}: stadium={stadium_name}, team={team}, location={location_raw}")

                    if stadium_name and team and location_raw:
                        self._process_mls_stadium([stadium_name, team, location_raw], stadiums)
                        time.sleep(self.rate_limit_delay)

        except Exception as e:
            logging.error(f"Error scraping MLS stadiums: {e}")
            # If optional, skip raising

    def _process_mls_stadium(self, data, stadiums: Dict) -> None:
        """
        data = [stadium_name, team, location].
        We'll store it in stadiums['mls'][stadium_name].
        """
        try:
            stadium_name, team, location = data
            stadium_name = self._clean_stadium_data(stadium_name)
            team = self._clean_stadium_data(team)
            location = self._clean_stadium_data(location)

            logging.info(f"Geocoding MLS stadium: {stadium_name} in {location}")
            coords = self._geocode_location(f"{stadium_name}, {location}")
            if not coords:
                coords = self._geocode_location(location)

            if coords:
                stadiums['mls'][stadium_name] = {
                    'location': location,
                    'team': team,
                    'latitude': coords['lat'],
                    'longitude': coords['lon'],
                    'display_name': coords.get('display_name', ''),
                    'type': coords.get('type', ''),
                    'last_verified': datetime.now().isoformat()
                }
            else:
                logging.error(f"Failed to geocode MLS stadium: {stadium_name}")
        except Exception as e:
            logging.error(f"Error processing MLS stadium: {e}")

    # ------------------------------------------------------------
    # HELPER FUNCTIONS
    # ------------------------------------------------------------
    def _clean_stadium_data(self, text: str) -> str:
        """
        Remove bracketed references [1], [2], etc.
        Keep letters, numbers, spaces, hyphens, and apostrophes.
        """
        text = re.sub(r'\[[^\]]*\]', '', text)  # remove footnotes like [1]
        text = re.sub(r'[^a-zA-Z0-9\s\-\']', ' ', text)
        text = ' '.join(text.split())
        return text

    def _geocode_location(self, search_query: str) -> Optional[Dict]:
        """
        Geocode a location with Nominatim. Only accept valid US coordinates.
        """
        try:
            encoded_query = quote(f"{search_query}, United States")
            geocode_url = (
                f"https://nominatim.openstreetmap.org/search?q={encoded_query}"
                f"&format=json&countrycodes=us"
            )
            resp = self.session.get(geocode_url, timeout=10)
            resp.raise_for_status()
            geo_data = resp.json()
            if geo_data:
                lat = float(geo_data[0]['lat'])
                lon = float(geo_data[0]['lon'])
                if self._validate_us_coordinates(lat, lon):
                    return {
                        'lat': lat,
                        'lon': lon,
                        'display_name': geo_data[0].get('display_name', ''),
                        'type': geo_data[0].get('type', '')
                    }
                else:
                    logging.error(f"Invalid US coords: {search_query} lat={lat} lon={lon}")
            return None
        except Exception as e:
            logging.error(f"Error geocoding {search_query}: {e}")
            return None

    def _validate_us_coordinates(self, lat: float, lon: float) -> bool:
        """
        Check if lat/lon is in the continental US, Alaska, or Hawaii bounds.
        """
        BOUNDS = {
            'continental': {'lat': (24.7, 49.4), 'lon': (-125.0, -66.9)},
            'alaska': {'lat': (51.0, 71.5), 'lon': (-180.0, -130.0)},
            'hawaii': {'lat': (18.7, 22.5), 'lon': (-160.3, -154.5)},
        }

        def in_bounds(a, b, region):
            return (region['lat'][0] <= a <= region['lat'][1] and
                    region['lon'][0] <= b <= region['lon'][1])

        return (
            in_bounds(lat, lon, BOUNDS['continental']) or
            in_bounds(lat, lon, BOUNDS['alaska']) or
            in_bounds(lat, lon, BOUNDS['hawaii'])
        )

def save_stadium_data(stadiums: Dict, filename: str = 'more_stadium_coordinates.json') -> None:
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(stadiums, f, indent=4)
        logging.info(f"Stadium data saved to {filename}")
    except Exception as e:
        logging.error(f"Error saving stadium data: {e}")

def main():
    scraper = MoreStadiumScraper()
    stadium_data = scraper.scrape_stadium_coordinates()
    save_stadium_data(stadium_data, 'more_stadium_coordinates.json')
    logging.info(f"MLB stadiums scraped: {len(stadium_data['mlb'])}")
    logging.info(f"MLS stadiums scraped: {len(stadium_data['mls'])}")

if __name__ == "__main__":
    main()
