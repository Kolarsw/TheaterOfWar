const fs = require('fs');
const gadm = JSON.parse(fs.readFileSync('src/data/gadm-france-departments.json', 'utf8'));

var records = [];

// All departments and their region IDs
var allRegions = gadm.features.map(function(f) {
  return { id: f.properties.region_id, name: f.properties.region_name, parent: f.properties.region_parent };
});

// Normandy coastal departments (D-Day landing zones)
var coastalDepts = ['FRA.9.1_1', 'FRA.9.3_1']; // Calvados, Manche
// Normandy inland departments
var inlandNormandy = ['FRA.9.2_1', 'FRA.9.4_1', 'FRA.9.5_1']; // Eure, Orne, Seine-Maritime
// Brittany (adjacent, axis held)
var brittany = allRegions.filter(function(r) { return r.parent === 'Bretagne'; }).map(function(r) { return r.id; });

// June 5: Everything axis
allRegions.forEach(function(r) {
  records.push({
    region_id: r.id,
    region_name: r.name,
    country_code: 'FRA',
    admin_level: 2,
    timestamp: '1944-06-05T00:00:00Z',
    controlling_faction: 'axis',
    supply_density: 50,
    terrain_type: 'plains'
  });
});

// June 6 12:00: Coastal Normandy contested, rest axis
allRegions.forEach(function(r) {
  var faction = 'axis';
  if (coastalDepts.indexOf(r.id) >= 0) faction = 'contested';
  records.push({
    region_id: r.id,
    region_name: r.name,
    country_code: 'FRA',
    admin_level: 2,
    timestamp: '1944-06-06T12:00:00Z',
    controlling_faction: faction,
    supply_density: faction === 'contested' ? 20 : 50,
    terrain_type: 'plains'
  });
});

// June 7: Coastal Normandy allied, inland Normandy contested, rest axis
allRegions.forEach(function(r) {
  var faction = 'axis';
  if (coastalDepts.indexOf(r.id) >= 0) faction = 'allied';
  if (inlandNormandy.indexOf(r.id) >= 0) faction = 'contested';
  records.push({
    region_id: r.id,
    region_name: r.name,
    country_code: 'FRA',
    admin_level: 2,
    timestamp: '1944-06-07T12:00:00Z',
    controlling_faction: faction,
    supply_density: faction === 'allied' ? 60 : faction === 'contested' ? 30 : 45,
    terrain_type: 'plains'
  });
});

// July 1944: Normandy allied, Brittany contested, rest axis
allRegions.forEach(function(r) {
  var faction = 'axis';
  var normandyIds = coastalDepts.concat(inlandNormandy);
  if (normandyIds.indexOf(r.id) >= 0) faction = 'allied';
  if (brittany.indexOf(r.id) >= 0) faction = 'contested';
  records.push({
    region_id: r.id,
    region_name: r.name,
    country_code: 'FRA',
    admin_level: 2,
    timestamp: '1944-07-15T00:00:00Z',
    controlling_faction: faction,
    supply_density: faction === 'allied' ? 70 : faction === 'contested' ? 35 : 40,
    terrain_type: 'plains'
  });
});

// August 1944: Normandy + Brittany + northern France allied, Paris area contested
var northernFrance = allRegions.filter(function(r) {
  return ['Normandie', 'Bretagne', 'Pays de la Loire', 'Centre-Val de Loire'].indexOf(r.parent) >= 0;
}).map(function(r) { return r.id; });
var parisArea = allRegions.filter(function(r) {
  return r.parent === 'Île-de-France';
}).map(function(r) { return r.id; });

allRegions.forEach(function(r) {
  var faction = 'axis';
  if (northernFrance.indexOf(r.id) >= 0) faction = 'allied';
  if (parisArea.indexOf(r.id) >= 0) faction = 'contested';
  records.push({
    region_id: r.id,
    region_name: r.name,
    country_code: 'FRA',
    admin_level: 2,
    timestamp: '1944-08-15T00:00:00Z',
    controlling_faction: faction,
    supply_density: faction === 'allied' ? 75 : faction === 'contested' ? 40 : 35,
    terrain_type: 'plains'
  });
});

// September 1944: Most of France allied, eastern border contested
var easternFrance = allRegions.filter(function(r) {
  return ['Grand Est', 'Bourgogne-Franche-Comté'].indexOf(r.parent) >= 0;
}).map(function(r) { return r.id; });

allRegions.forEach(function(r) {
  var faction = 'allied';
  if (easternFrance.indexOf(r.id) >= 0) faction = 'contested';
  records.push({
    region_id: r.id,
    region_name: r.name,
    country_code: 'FRA',
    admin_level: 2,
    timestamp: '1944-09-15T00:00:00Z',
    controlling_faction: faction,
    supply_density: faction === 'allied' ? 80 : 45,
    terrain_type: 'plains'
  });
});

// December 1944: All France allied
allRegions.forEach(function(r) {
  records.push({
    region_id: r.id,
    region_name: r.name,
    country_code: 'FRA',
    admin_level: 2,
    timestamp: '1944-12-01T00:00:00Z',
    controlling_faction: 'allied',
    supply_density: 85,
    terrain_type: 'plains'
  });
});

fs.writeFileSync('src/data/mock-territory-control.json', JSON.stringify(records, null, 2));
console.log('Generated ' + records.length + ' territory control records');
console.log('Timestamps: 7 snapshots (Jun 5, Jun 6, Jun 7, Jul 15, Aug 15, Sep 15, Dec 1)');
