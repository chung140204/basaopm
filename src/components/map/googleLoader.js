// Lightweight Google Maps JS API loader. Loads the script once and resolves
// when window.google.maps is ready. Returns a promise.
let loadPromise = null;

export function loadGoogleMaps(apiKey) {
  if (typeof window !== 'undefined' && window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('NO_API_KEY'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error('GOOGLE_MAPS_LOAD_FAILED'));
    };
    script.onerror = () => reject(new Error('GOOGLE_MAPS_LOAD_FAILED'));
    document.head.appendChild(script);
  });
  return loadPromise;
}
