import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.ARC_FLOW_BASE_URL ?? "http://localhost:3000";
const email = process.env.ARC_FLOW_EMAIL;
const password = process.env.ARC_FLOW_PASSWORD;
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!email || !password) {
  console.error("Missing ARC_FLOW_EMAIL or ARC_FLOW_PASSWORD.");
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or anon key.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const { data: authData, error: authError } =
  await supabase.auth.signInWithPassword({
    email,
    password,
  });

if (authError || !authData.session?.access_token) {
  console.error("Failed to sign in.", authError?.message);
  process.exit(1);
}

const token = authData.session.access_token;

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request failed: ${path}`);
  }
  return json;
}

async function run() {
  console.log("Fetching arc state…");
  const today = await api("/api/arcs/today");
  console.log(`Offers: ${today.offers?.length ?? 0}`);

  if (today.offers?.length) {
    console.log("Accepting first offer…");
    await api("/api/arcs/offers/accept", {
      method: "POST",
      body: JSON.stringify({ offerId: today.offers[0].id }),
    });
  }

  const afterAccept = await api("/api/arcs/today");
  console.log(`Due steps: ${afterAccept.dueSteps?.length ?? 0}`);
  if (afterAccept.dueSteps?.length) {
    const step = afterAccept.dueSteps[0];
    const option = step.step.options?.[0];
    if (option) {
      console.log(`Resolving step ${step.step.step_key}…`);
      await api("/api/arcs/instances/resolve", {
        method: "POST",
        body: JSON.stringify({
          arcInstanceId: step.instance.id,
          optionKey: option.option_key,
        }),
      });
    }
  }

  const afterResolve = await api("/api/arcs/today");
  if (afterResolve.dueSteps?.length) {
    const step = afterResolve.dueSteps[0];
    console.log(`Deferring step ${step.step.step_key}…`);
    await api("/api/arcs/instances/defer", {
      method: "POST",
      body: JSON.stringify({ arcInstanceId: step.instance.id }),
    });
  }

  console.log("Arc flow complete.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
