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
        logging.FileHandler('stadium_scraper.log'),
        logging.StreamHandler()
    ]
)

class StadiumScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'StadiumCoordinateCollector/1.0 (Educational Purpose)'
        })
        self.rate_limit_delay = 1.1  # Slightly over 1 second to be safe

    def scrape_stadium_coordinates(self) -> Dict:
        stadiums = {
            'metadata': {
                'last_updated': datetime.now().isoformat(),
                'version': '1.0'
            },
            'nfl': {},
            'ncaa': {}
        }
        
        # Scrape NFL stadiums
        logging.info("Starting NFL stadium scraping...")
        self._scrape_nfl_stadiums(stadiums)
        
        # Scrape NCAA stadiums
        logging.info("Starting NCAA stadium scraping...")
        self._scrape_ncaa_stadiums(stadiums)
        
        return stadiums

    def _scrape_nfl_stadiums(self, stadiums: Dict) -> None:
        nfl_url = "https://en.wikipedia.org/wiki/List_of_current_National_Football_League_stadiums"
        try:
            response = self.session.get(nfl_url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find the correct table
            tables = soup.find_all('table', {'class': 'wikitable'})
            table = None
            for t in tables:
                if 'Stadium' in str(t):
                    table = t
                    break

            if not table:
                raise ValueError("NFL stadium table not found")

            rows = table.find_all('tr')[1:]  # Skip header row
            total_rows = len(rows)
            logging.info(f"Found {total_rows} NFL stadiums to process")
            
            for idx, row in enumerate(rows, 1):
                try:
                    # Get all cells including th and td
                    cells = row.find_all(['th', 'td'])
                    if len(cells) >= 3:
                        # The stadium name is in the 'Name' column
                        stadium_name = cells[1].text.strip()
                        team = cells[2].text.strip()
                        location = cells[3].text.strip()
                        
                        logging.info(f"Processing: Stadium={stadium_name}, Team={team}, Location={location}")
                        
                        if stadium_name and location and team:
                            self._process_nfl_stadium([stadium_name, location, team], stadiums)
                            time.sleep(self.rate_limit_delay)
                except Exception as e:
                    logging.error(f"Error processing row {idx}: {e}")

        except Exception as e:
            logging.error(f"Error scraping NFL stadiums: {e}")
            raise

    def _scrape_ncaa_stadiums(self, stadiums: Dict) -> None:
        ncaa_url = "https://en.wikipedia.org/wiki/List_of_NCAA_Division_I_FBS_football_stadiums"
        try:
            response = self.session.get(ncaa_url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find the correct table
            tables = soup.find_all('table', {'class': 'wikitable'})
            table = tables[0]  # The first table contains the stadium list

            rows = table.find_all('tr')[1:]  # Skip header row
            total_rows = len(rows)
            logging.info(f"Found {total_rows} NCAA stadiums to process")
            
            for idx, row in enumerate(rows, 1):
                try:
                    # Get all cells including th and td
                    cells = row.find_all(['th', 'td'])
                    if len(cells) >= 5:  # NCAA table has more columns
                        stadium_name = cells[1].text.strip()  # Stadium name is in second column
                        city = cells[2].text.strip()  # City
                        state = cells[3].text.strip()  # State
                        team = cells[4].text.strip()  # Team
                        location = f"{city}, {state}"
                        
                        logging.info(f"Processing: Stadium={stadium_name}, Team={team}, Location={location}")
                        
                        if stadium_name and location and team:
                            self._process_ncaa_stadium([stadium_name, team, location], stadiums)
                            time.sleep(self.rate_limit_delay)
                except Exception as e:
                    logging.error(f"Error processing row {idx}: {e}")

        except Exception as e:
            logging.error(f"Error scraping NCAA stadiums: {e}")
            raise

    def _process_nfl_stadium(self, data, stadiums: Dict) -> None:
        try:
            stadium_name, location, team = data
            
            if not all([stadium_name, location, team]):
                logging.error(f"Missing required data for NFL stadium: {stadium_name}")
                return
            
            logging.info(f"Geocoding NFL stadium: {stadium_name} in {location}")
            coordinates = self._geocode_location(f"{stadium_name}, {location}")
            if coordinates:
                stadiums['nfl'][stadium_name] = {
                    'location': location,
                    'team': team,
                    'latitude': coordinates['lat'],
                    'longitude': coordinates['lon'],
                    'display_name': coordinates.get('display_name', ''),
                    'type': coordinates.get('type', ''),
                    'last_verified': datetime.now().isoformat()
                }
            else:
                logging.error(f"Failed to geocode NFL stadium: {stadium_name}")
        except Exception as e:
            logging.error(f"Error processing NFL stadium {stadium_name}: {e}")

    def _clean_stadium_data(self, text: str) -> str:
        """Clean stadium names and locations by removing footnotes and special characters"""
        
        # Remove footnote markers like [f], [O 1], etc.
        text = re.sub(r'\[[a-zA-Z0-9_ ]+\]', '', text)
        
        # Remove special characters but keep hyphens and apostrophes
        text = re.sub(r'[^a-zA-Z0-9\s\-\']', ' ', text)
        
        # Clean up whitespace
        text = ' '.join(text.split())
        
        return text

    def _process_ncaa_stadium(self, data, stadiums: Dict) -> None:
        try:
            stadium_name, team, location = data
            
            # Clean up the data
            stadium_name = self._clean_stadium_data(stadium_name)
            location = self._clean_stadium_data(location)
            team = self._clean_stadium_data(team)
            
            # Special cases for locations
            location_fixes = {
                "Mississippi State": "Starkville, MS",
                "Notre Dame": "Notre Dame, IN",
                "University": "Oxford, MS",  # For Ole Miss
                "College Township": "State College, PA",  # For Penn State
                "USAF Academy": "Colorado Springs, CO",
                "College Park": "College Park, MD",
                "College Station": "College Station, TX",
                "Paradise": "Las Vegas, NV"  # For Allegiant Stadium
            }
            
            # Check if we need to fix this location
            for key, fixed_location in location_fixes.items():
                if key in location:
                    location = fixed_location
                    break
            
            logging.info(f"Geocoding NCAA stadium: {stadium_name} in {location}")
            coordinates = self._geocode_location(f"{stadium_name}, {location}")
            
            # If first attempt fails, try with just city and state
            if not coordinates:
                logging.info(f"Retrying with just location: {location}")
                coordinates = self._geocode_location(location)
            
            if coordinates:
                stadiums['ncaa'][stadium_name] = {
                    'location': location,
                    'team': team,
                    'latitude': coordinates['lat'],
                    'longitude': coordinates['lon'],
                    'display_name': coordinates.get('display_name', ''),
                    'type': coordinates.get('type', ''),
                    'last_verified': datetime.now().isoformat()
                }
            else:
                logging.error(f"Failed to geocode NCAA stadium: {stadium_name}")
        except Exception as e:
            logging.error(f"Error processing NCAA stadium {stadium_name}: {e}")

    def _geocode_location(self, search_query: str) -> Optional[Dict]:
        """
        Geocode a location with validation for US coordinates.
        US latitude range: ~24.7° to ~49.4°
        US longitude range: ~-125° to ~-66.9°
        """
        try:
            encoded_query = quote(f"{search_query}, United States")  # Add USA to improve accuracy
            geocode_url = f"https://nominatim.openstreetmap.org/search?q={encoded_query}&format=json&countrycodes=us"
            
            response = self.session.get(geocode_url, timeout=10)
            response.raise_for_status()
            geo_data = response.json()
            
            if geo_data:
                lat = float(geo_data[0]['lat'])
                lon = float(geo_data[0]['lon'])
                
                # Validate coordinates are within continental US bounds
                if self._validate_us_coordinates(lat, lon):
                    return {
                        'lat': lat,
                        'lon': lon,
                        'display_name': geo_data[0].get('display_name', ''),
                        'type': geo_data[0].get('type', '')
                    }
                else:
                    logging.error(f"Invalid US coordinates for {search_query}: {lat}, {lon}")
            return None
        except Exception as e:
            logging.error(f"Error geocoding {search_query}: {e}")
            return None

    def _validate_us_coordinates(self, lat: float, lon: float) -> bool:
        """Validate if coordinates are within continental US bounds (including Alaska and Hawaii)"""
        # Continental US, Alaska, and Hawaii bounds
        BOUNDS = {
            'continental': {
                'lat': (24.7, 49.4),
                'lon': (-125.0, -66.9)
            },
            'alaska': {
                'lat': (51.0, 71.5),
                'lon': (-180.0, -130.0)
            },
            'hawaii': {
                'lat': (18.7, 22.5),
                'lon': (-160.3, -154.5)
            }
        }
        
        def in_bounds(lat, lon, bounds):
            return (bounds['lat'][0] <= lat <= bounds['lat'][1] and
                    bounds['lon'][0] <= lon <= bounds['lon'][1])
        
        return (in_bounds(lat, lon, BOUNDS['continental']) or
                in_bounds(lat, lon, BOUNDS['alaska']) or
                in_bounds(lat, lon, BOUNDS['hawaii']))

def save_stadium_data(stadiums: Dict, filename: str = 'stadium_coordinates.json') -> None:
    try:
        with open(filename, 'w') as f:
            json.dump(stadiums, f, indent=4)
        logging.info(f"Stadium data saved to {filename}")
    except Exception as e:
        logging.error(f"Error saving stadium data: {e}")

def main():
    scraper = StadiumScraper()
    stadiums = scraper.scrape_stadium_coordinates()
    save_stadium_data(stadiums)
    
    # Print summary statistics
    logging.info(f"Total NFL stadiums collected: {len(stadiums['nfl'])}")
    logging.info(f"Total NCAA stadiums collected: {len(stadiums['ncaa'])}")

if __name__ == "__main__":
    main() 