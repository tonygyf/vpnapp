export async function onRequest({ request }) {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL('https://vpn.gyf123.dpdns.org/sub');
  targetUrl.search = incomingUrl.search;
  const response = await fetch(targetUrl.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': request.headers.get('User-Agent') || 'V2Ray VPN App',
    },
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
