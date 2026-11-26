export function decodePolyline(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 100000) throw new Error('Invalid route geometry.');
  let index = 0; let latitude = 0; let longitude = 0; const points = [];
  function read() {
    let result = 0; let shift = 0; let byte;
    do {
      if (index >= encoded.length || shift > 30) throw new Error('Invalid route geometry.');
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw new Error('Invalid route geometry.');
      result |= (byte & 31) << shift; shift += 5;
    } while (byte >= 32);
    return result & 1 ? ~(result >>> 1) : result >>> 1;
  }
  while (index < encoded.length) {
    latitude += read(); longitude += read();
    if (Math.abs(latitude / 1e5) > 90 || Math.abs(longitude / 1e5) > 180) throw new Error('Invalid route geometry.');
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  if (points.length < 2) throw new Error('Invalid route geometry.');
  return points;
}
