export async function POST() {
  // Clear cookie
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'auth_token=; Path=/; Max-Age=0' }
  })
}


