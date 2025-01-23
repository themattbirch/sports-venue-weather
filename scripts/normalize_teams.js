const fs = require('fs');

const filePath = 'data/stadium_coordinates.json';

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading stadium_coordinates.json:', err);
        return;
    }

    let jsonData;
    try {
        jsonData = JSON.parse(data);
    } catch (parseErr) {
        console.error('Error parsing JSON:', parseErr);
        return;
    }

    ['nfl', 'ncaa'].forEach(league => {
        if (jsonData[league] && typeof jsonData[league] === 'object') {
            Object.entries(jsonData[league]).forEach(([stadiumName, stadiumInfo]) => {
                if (stadiumInfo.team && typeof stadiumInfo.team === 'string') {
                    // Ensure team names are separated by ', '
                    const teams = stadiumInfo.team.match(/[A-Z][a-z0-9&]+(?: [A-Z][a-z0-9&]+)*/g);
                    if (teams) {
                        jsonData[league][stadiumName].team = teams.join(', ');
                    }
                }
            });
        }
    });

    fs.writeFile(filePath, JSON.stringify(jsonData, null, 4), 'utf8', (writeErr) => {
        if (writeErr) {
            console.error('Error writing to stadium_coordinates.json:', writeErr);
            return;
        }
        console.log('stadium_coordinates.json has been normalized.');
    });
});
