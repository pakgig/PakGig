/* PakGig — shows an approximate US dollar price under each gig price on Services.html.
   Gigs are priced in PKR. The dollar amount is only a guide: the exact rate is shown
   and locked at checkout. The rate comes from the database and follows the market rate. */
import { supabase } from "./supabaseClient.js";

const grid = document.getElementById("servicesGrid");
let rate = null;

function decorate() {
    if (!grid || !rate) return;
    grid.querySelectorAll(".service-card").forEach((card) => {
        if (card.dataset.usdShown) return;
        const priceEl = Array.from(card.querySelectorAll("div")).find((d) => /^PKR\s/.test(d.textContent.trim()) && d.children.length === 0);
        if (!priceEl) return;
        const pkr = Number(priceEl.textContent.replace(/[^0-9.]/g, ""));
        if (!pkr) return;
        const usd = Math.ceil((pkr / rate) * 100) / 100;
        const note = document.createElement("div");
        note.className = "text-xs text-gray-500 font-medium";
        note.textContent = "\u2248 $" + usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USD";
        note.title = "Approximate price in US dollars. The exact rate is shown at checkout.";
        priceEl.insertAdjacentElement("afterend", note);
        card.dataset.usdShown = "1";
    });
}

async function start() {
    if (!grid) return;
    try {
        const { data, error } = await supabase.rpc("get_public_usd_rate");
        if (error || !data || Number(data) <= 0) return;
        rate = Number(data);
    } catch (e) { return; }

    new MutationObserver(decorate).observe(grid, { childList: true });
    decorate();
}

start();
