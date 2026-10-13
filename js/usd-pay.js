/* PakGig — "Pay in US dollars (bank transfer)" option in the order popup on Services.html.
   The button only appears when US dollar payments are switched on in the database.
   The buyer sees the exact dollar amount and the bank details, sends the transfer,
   then enters the transfer reference. The admin confirms it after the money arrives. */
import { supabase } from "./supabaseClient.js";

const grid = document.getElementById("servicesGrid");
const form = document.getElementById("escrowPaymentForm");

if (grid && form) {
    let gigId = null;
    let quote = null;

    const box = document.createElement("div");
    box.id = "usdBox";
    box.style.cssText = "display:none; margin-bottom:16px; padding:14px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:10px; text-align:center;";
    box.innerHTML =
        '<p id="usdIntro" style="margin:0 0 10px 0; font-size:13px; color:#1e3a8a;"></p>' +
        '<button type="button" id="usdOpenBtn" style="width:100%; background:#1d4ed8; color:#fff; padding:11px 15px; border:none; border-radius:8px; font-weight:bold; font-size:14px; cursor:pointer;">Pay in US Dollars (Bank Transfer)</button>';
    form.parentNode.insertBefore(box, form);

    const panel = document.createElement("div");
    panel.id = "usdPanel";
    panel.style.cssText = "display:none; margin-bottom:16px; text-align:left; font-size:13px; color:#1f2937;";
    form.parentNode.insertBefore(panel, form);

    const intro = box.querySelector("#usdIntro");
    const openBtn = box.querySelector("#usdOpenBtn");

    const money = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function el(tag, css, text) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function showOthers(show) {
        form.style.display = show ? "block" : "none";
        Array.from(form.parentNode.children).forEach((c) => {
            if (c !== box && c !== panel && c !== form && c.querySelector && c.querySelector("#payOnlineBtn")) {
                c.style.display = show ? "block" : "none";
            }
        });
    }

    async function loadQuote() {
        box.style.display = "none";
        panel.style.display = "none";
        quote = null;
        if (!gigId) return;
        try {
            const { data, error } = await supabase.rpc("get_usd_quote", { p_gig_id: gigId });
            if (error || !data) return;
            quote = data;
            intro.textContent = "Outside Pakistan? Pay " + money(quote.usdAmount) + " USD by bank transfer. Your payment is held safely in escrow.";
            box.style.display = "block";
        } catch (e) { /* the option simply stays hidden */ }
    }

    grid.addEventListener("click", (e) => {
        const btn = e.target.closest(".orderGigBtn");
        if (!btn) return;
        gigId = btn.dataset.gig;
        showOthers(true);
        // wait a moment so the sign-in check on the page runs first
        setTimeout(loadQuote, 400);
    });

    function renderPanel() {
        panel.innerHTML = "";
        const d = quote.details || {};

        panel.appendChild(el("h4", "margin:0 0 6px 0; font-size:15px; font-weight:700; color:#1e3a8a; text-align:center;", "Pay by US bank transfer"));

        const amt = el("div", "background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 12px; text-align:center; margin-bottom:10px;");
        amt.appendChild(el("div", "font-size:12px; color:#475569;", "Send exactly"));
        amt.appendChild(el("div", "font-size:24px; font-weight:800; color:#1d4ed8;", money(quote.usdAmount) + " USD"));
        amt.appendChild(el("div", "font-size:11px; color:#64748b; margin-top:2px;", "Service price Rs " + Number(quote.pricePkr).toLocaleString() + " at Rs " + Number(quote.rate).toLocaleString() + " per US dollar. This rate is locked for your order."));
        panel.appendChild(amt);

        const rows = [
            ["Beneficiary name", d.beneficiary],
            ["Bank name", d.bank_name],
            ["Account number", d.account_number],
            ["Routing number (ABA)", d.routing_aba],
            ["SWIFT code", d.swift],
            ["Account type", d.account_type],
            ["Transfer type", d.transfer_type],
            ["Bank address", d.bank_address]
        ].filter((r) => r[1]);
        const det = el("div", "background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-bottom:10px; line-height:1.6;");
        rows.forEach((r) => {
            const line = el("div", "word-break:break-word;");
            line.appendChild(el("b", "", r[0] + ": "));
            line.appendChild(document.createTextNode(r[1]));
            det.appendChild(line);
        });
        panel.appendChild(det);

        panel.appendChild(el("p", "margin:0 0 10px 0; font-size:11px; color:#64748b;",
            "Send the transfer from your own bank. Bank fees are paid by you, so the full amount above must arrive. After you send it, fill in the form below. We start your order once the money arrives (usually 1 to 5 business days)."));

        const f = document.createElement("form");
        f.id = "usdForm";
        const mk = (label, name, type, value, ph) => {
            const wrap = el("div", "margin-bottom:10px;");
            wrap.appendChild(el("label", "display:block; font-size:12px; font-weight:bold; margin-bottom:4px;", label));
            const i = document.createElement("input");
            i.name = name; i.type = type; i.required = true; i.placeholder = ph || "";
            if (type === "number") { i.step = "0.01"; i.min = "0.01"; }
            if (value !== undefined) i.value = value;
            i.style.cssText = "width:100%; padding:8px 10px; border:1px solid #ccc; border-radius:6px; box-sizing:border-box; font-size:14px;";
            wrap.appendChild(i);
            return wrap;
        };
        f.appendChild(mk("Name on the sending bank account:", "payer", "text", "", "Your full name"));
        f.appendChild(mk("Transfer reference (from your bank):", "ref", "text", "", "e.g. reference or trace number"));
        f.appendChild(mk("Amount sent (USD):", "sent", "number", quote.usdAmount));

        const msg = el("p", "display:none; margin:0 0 10px 0; font-size:12px; color:#991b1b;");
        f.appendChild(msg);

        const submit = el("button", "width:100%; background:#1d4ed8; color:#fff; padding:10px 15px; border:none; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer;", "I sent the transfer, place my order");
        submit.type = "submit";
        f.appendChild(submit);

        const back = el("button", "display:block; margin:10px auto 0; background:none; border:none; color:#475569; font-size:12px; text-decoration:underline; cursor:pointer;", "Back to other payment options");
        back.type = "button";
        back.addEventListener("click", () => { panel.style.display = "none"; box.style.display = "block"; showOthers(true); });
        f.appendChild(back);

        f.addEventListener("submit", async (ev) => {
            ev.preventDefault();
            msg.style.display = "none";
            submit.disabled = true;
            submit.textContent = "Placing order...";
            try {
                const { error } = await supabase.rpc("create_order_usd", {
                    p_gig_id: gigId,
                    p_payer_name: f.elements["payer"].value.trim(),
                    p_tid: f.elements["ref"].value.trim(),
                    p_amount_reported_usd: Number(f.elements["sent"].value)
                });
                if (error) throw error;
                panel.innerHTML = "";
                const ok = el("div", "padding:12px; border-radius:8px; background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; font-size:13px; line-height:1.5;");
                ok.appendChild(el("b", "", "Order placed. "));
                ok.appendChild(document.createTextNode("We will start it as soon as your transfer arrives. Track it in "));
                const a = el("a", "color:#047857; font-weight:bold; text-decoration:underline;", "My Orders");
                a.href = "order.html";
                ok.appendChild(a);
                ok.appendChild(document.createTextNode("."));
                panel.appendChild(ok);
            } catch (err) {
                const m = String((err && err.message) || "");
                msg.textContent = m.includes("bad_tid") ? "Please enter the transfer reference (4 to 40 characters)."
                    : m.includes("kyc_required") ? "Please complete identity verification (KYC) first."
                    : "Could not place the order. Please check the details and try again.";
                msg.style.display = "block";
                submit.disabled = false;
                submit.textContent = "I sent the transfer, place my order";
            }
        });

        panel.appendChild(f);
    }

    openBtn.addEventListener("click", () => {
        if (!quote) return;
        renderPanel();
        box.style.display = "none";
        showOthers(false);
        panel.style.display = "block";
    });
}
