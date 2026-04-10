const fs = require('fs');
const simplify = require('@turf/simplify').default;

const raw = JSON.parse(fs.readFileSync('/tmp/gadm_france/gadm41_FRA_2.json', 'utf8'));

// Simplify geometry and strip to essential properties
const simplified = {
  type: "FeatureCollection",
  features: raw.features.map(function(f) {
    var s = simplify(f, { tolerance: 0.005, highQuality: true });
    return {
      type: "Feature",
      geometry: s.geometry,
      properties: {
        region_id: f.properties.GID_2,
        region_name: f.properties.NAME_2,
        region_parent: f.properties.NAME_1,
        country_code: f.properties.GID_0,
      }
    };
  })
};

const output = JSON.stringify(simplified);
fs.writeFileSync('src/data/gadm-france-departments.json', output);
console.log('Features:', simplified.features.length);
console.log('File size:', (output.length / 1024).toFixed(0) + 'KB');

// List Normandy departments for mock data reference
var normandy = simplified.features.filter(function(f) {
  return f.properties.region_parent === 'Normandie';
});
console.log('\nNormandy departments:');
normandy.forEach(function(f) {
  console.log('  ' + f.properties.region_id + ' - ' + f.properties.region_name);
});
