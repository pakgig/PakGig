/* PakGig — Small display and business-rule helpers shared across pages.
   availableActions() mirrors the permission checks inside the order_action()
   database function exactly, so the buttons a page offers always match
   what the server will actually allow. */

export function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

export function money(n) {
    return "Rs. " + Number(n || 0).toLocaleString();
}

export function shortId(id) {
    return String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function roleIn(order, uid) {
    return order.sellerId === uid ? "seller" : "buyer";
}

export const CATEGORIES = {
    web: "Web & App Development",
    design: "Graphics & Design",
    seo: "Digital Marketing / SEO",
    architecture: "Architecture & Architectural Design"
};

export const STATUS_META = {
    pending:     { label: "Pending",     badge: "bg-gray-100 text-gray-600 border-gray-200" },
    in_progress: { label: "In Progress", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    delivered:   { label: "Delivered",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
    completed:   { label: "Completed",   badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelled:   { label: "Canceled",    badge: "bg-red-50 text-red-700 border-red-200" }
};

export const ESCROW_META = {
    awaiting: { label: "Awaiting deposit", color: "text-gray-500" },
    held:     { label: "Held",             color: "text-amber-700" },
    released: { label: "Released",         color: "text-emerald-700" },
    refunded: { label: "Refunded",         color: "text-gray-500" }
};

// Platform fee: PakGig takes 8% of every order; the seller receives the rest.
// (Must match the 0.08 used inside the request_withdrawal() database function.)
export function feeFor(amount) {
    return Math.round(Number(amount || 0) * 0.08);
}
export function payoutFor(amount) {
    return Number(amount || 0) - feeFor(amount);
}

// Which actions to offer for this order, for this viewer. Mirrors the
// order_action() database function's own rules — if it's not listed
// here, the server would reject it too.
export function availableActions(o, uid, isAdmin) {
    const openDispute = o.disputed && o.disputeStatus === "open";

    if (isAdmin) {
        const actions = [];
        if (o.status === "pending" && o.escrow === "awaiting") actions.push("verify");
        if (o.escrow === "held" && ["in_progress", "delivered"].includes(o.status) && !openDispute) actions.push("refund");
        return actions;
    }

    const role = roleIn(o, uid);
    const actions = [];

    if (role === "buyer") {
        if (o.status === "pending" && o.escrow === "awaiting") actions.push("cancel");
        if (o.status === "delivered" && o.escrow === "held" && !openDispute) actions.push("release", "revision");
    }
    if (role === "seller") {
        if (o.status === "in_progress" && o.escrow === "held" && !openDispute) actions.push("deliver");
    }
    if (o.escrow === "held" && ["in_progress", "delivered"].includes(o.status) && !openDispute) {
        actions.push("dispute");
    }
    return actions;
}

// Seller's escrow/earnings summary — amounts are the seller's payout
// (after the 8% platform fee), matching what they'll actually receive.
export function sellerTotals(orders, withdrawals, uid) {
    let held = 0, earned = 0;
    orders.forEach((o) => {
        if (o.sellerId !== uid) return;
        if (o.escrow === "held") held += payoutFor(o.amount);
        if (o.escrow === "released") earned += payoutFor(o.amount);
    });
    let withdrawn = 0;
    withdrawals.forEach((w) => {
        if (w.sellerId === uid) withdrawn += Number(w.amount);
    });
    return { held, earned, withdrawn, available: Math.max(0, earned - withdrawn) };
}

// Buyer's total currently held in escrow (gross — what they paid).
export function buyerHeld(orders, uid) {
    return orders
        .filter((o) => o.buyerId === uid && o.escrow === "held")
        .reduce((sum, o) => sum + Number(o.amount), 0);
}
