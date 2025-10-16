<script>
  export let address; // e.g. "1600 Amphitheatre Parkway, Mountain View, CA"
  export let label = address;

  /**
   * Returns a platform-appropriate map link using an address string.
   * - iOS/iPadOS: geo-navigation:// (default navigation app)
   * - macOS: maps:// (Apple Maps app)
   * - Android: geo: URI (opens default map app, usually Google Maps)
   * - Fallback: Google Maps web URL
   */
  function getMapLink(address, label) {
    const encodedAddress = encodeURIComponent(address);
    const encodedLabel = encodeURIComponent(label);
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    // iOS / iPadOS
    if (/iPad|iPhone/.test(ua) && !window.MSStream) {
      return `geo-navigation:///place?address=${encodedAddress}`;
    }

    // macOS
    if (/Macintosh/.test(ua) && !window.MSStream) {
      return `maps://?q=${encodedAddress}`;
    }

    // Android
    if (/android/i.test(ua)) {
      return `geo:0,0?q=${encodedAddress}(${encodedLabel})`;
    }

    // Default fallback (desktop / unknown)
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }
</script>

<a
  href={getMapLink(address, label)}
  target="_blank"
  rel="noopener"
  class="text-accentLight hover:underline"
>
  {address}
</a>
