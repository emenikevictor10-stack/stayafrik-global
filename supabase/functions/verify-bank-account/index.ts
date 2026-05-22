import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const account_number = String(body.account_number || "").trim();
    const bank_code = String(body.bank_code || "").trim();
    if (!/^\d{10}$/.test(account_number) || !bank_code) {
      return new Response(JSON.stringify({ error: "Provide a 10-digit account number and bank code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Bank verification is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If client requested the bank list, return it
    if (body.list_banks) {
      const r = await fetch("https://api.paystack.co/bank?country=nigeria", { headers: { Authorization: `Bearer ${key}` } });
      const j = await r.json();
      return new Response(JSON.stringify(j), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const r = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const j = await r.json();
    if (!r.ok || !j.status) {
      return new Response(JSON.stringify({ error: j.message || "Could not verify account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ account_name: j.data?.account_name, account_number: j.data?.account_number }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
