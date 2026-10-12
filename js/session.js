/* PakGig — Auth/session helpers (Supabase version)
   Used by every page: index, login, signup, Services, dashboard, order,
   messages, escrow, profile, admin. */
import { supabase } from "./supabaseClient.js";

// Turns a raw Supabase auth error message into a friendly line.
export function friendlyAuthError(message) {
    const m = (message || "").toLowerCase();
    if (m.includes("banned") || m.includes("user_banned")) return "Your account has been suspended due to a violation of our Terms & Conditions. If you believe this is a mistake, please contact pakgig.support@gmail.com.";
    if (m.includes("invalid login credentials")) return "Incorrect email or password.";
    if (m.includes("user already registered")) return "An account with this email already exists.";
    if (m.includes("password should be at least")) return "Password must be at least 6 characters long.";
    if (m.includes("invalid email") || m.includes("unable to validate email")) return "That email address doesn't look valid.";
    if (m.includes("email not confirmed")) return "Please verify your email first.";
    if (m.includes("for security purposes") || m.includes("you can only request this after")) return "Please wait a minute before requesting another email.";
    if (m.includes("rate limit")) return "Too many attempts. Please try again in a little while.";
    if (m.includes("email address") && m.includes("is invalid")) return "We couldn't send an email to this address right now. Please check the address and try again later, or contact pakgig.support@gmail.com.";
    if (m.includes("has_history")) return "This account can't be deleted because it has order or withdrawal records.";
    if (m.includes("kyc_required")) return "Please complete your identity verification (KYC) first.";
    return message || "Something went wrong. Please try again.";
}

// Supabase users have `id`; the pages were written using `uid` and
// `displayName`. This adds those two names so every page works the same.
function withAliases(user) {
    if (!user) return user;
    return Object.assign({}, user, {
        uid: user.id,
        displayName: (user.user_metadata && user.user_metadata.full_name) || ""
    });
}

// Resolves with the logged-in user (or null) once Supabase has checked
// the current session.
export async function whenAuthReady() {
    const { data } = await supabase.auth.getSession();
    return data.session ? withAliases(data.session.user) : null;
}

// Reads the signed-in user's profile row. A slow or failed request is retried
// up to 3 times, so one hiccup is never mistaken for "this user is not an admin".
// Returns { profile, failed }:
//   profile = the row, or null
//   failed  = true when the profile could not be read because of a network or
//             server problem (as opposed to the row genuinely not existing).
async function fetchProfileWithRetry(userId) {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await supabase
                .from("profiles")
                .select("role, kyc_status, status, suspension_reason")
                .eq("id", userId)
                .single();
            if (!res.error && res.data) return { profile: res.data, failed: false };
            lastError = res.error || new Error("no data");
            // PGRST116 means "no row found": retrying will not help.
            if (res.error && res.error.code === "PGRST116") return { profile: null, failed: false };
        } catch (err) {
            lastError = err;
        }
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
    return { profile: null, failed: !!lastError };
}

// Shown instead of redirecting when the account could not be checked
// (for example a weak connection). The person stays on the page and can reload.
function showVerifyError() {
    const bar = document.createElement("div");
    bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#fef2f2;color:#991b1b;border-bottom:1px solid #fecaca;padding:12px 16px;font:600 13px sans-serif;text-align:center";
    bar.innerHTML = 'We could not verify your account right now. Please check your connection and <a href="" style="text-decoration:underline">reload this page</a>.';
    document.body.appendChild(bar);
}

// For pages that require a logged-in user: redirects to login.html (or
// index.html, if adminOnly and the user isn't an admin) and otherwise
// resolves with { user }.
// Suspended accounts are signed out and sent to the login page.
// KYC: every buyer and seller must have an approved KYC. Pages that call
// requireLogin() are sent to kyc.html until it is approved (admins are
// exempt). Only kyc.html and profile.html pass { skipKyc: true }.
export async function requireLogin(opts = {}) {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
        window.location.href = "login.html";
        return new Promise(() => {}); // page is navigating away
    }
    const user = withAliases(session.user);
    const { profile, failed } = await fetchProfileWithRetry(user.id);

    // The account could not be checked (network/server problem). Do NOT treat
    // that as "not an admin" or "KYC missing": stay here and ask for a reload.
    if (failed) {
        showVerifyError();
        return new Promise(() => {});
    }

    if (profile && profile.status === "suspended") {
        // Keep the reason so the login page can show it after sign-out.
        try { sessionStorage.setItem("pakgigSuspendedReason", profile.suspension_reason || ""); } catch (e) {}
        await supabase.auth.signOut();
        window.location.href = "login.html?suspended=1";
        return new Promise(() => {});
    }
    if (opts.adminOnly) {
        if (!profile || profile.role !== "admin") {
            window.location.href = "index.html";
            return new Promise(() => {});
        }
    }
    if (!opts.skipKyc) {
        const isAdmin = profile && profile.role === "admin";
        if (!isAdmin && (!profile || profile.kyc_status !== "approved")) {
            window.location.href = "kyc.html";
            return new Promise(() => {});
        }
    }
    return { user };
}

// Wires up every element with a [data-logout] attribute to sign out and
// redirect (default: the element's own href, else index.html).
export function bindLogout(redirectTo) {
    document.querySelectorAll("[data-logout]").forEach((el) => {
        el.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = redirectTo || el.getAttribute("href") || "index.html";
        });
    });
}

// Shows/hides the "Sign In / Join Free" buttons vs the profile menu in the
// navbar, and keeps them in sync whenever the user logs in/out.
export async function bindNavbar() {
    const { data } = await supabase.auth.getSession();
    await updateNavbar(data.session);
    supabase.auth.onAuthStateChange((_event, session) => updateNavbar(session));
}

async function updateNavbar(session) {
    const authButtons = document.getElementById("auth-buttons");
    const profileMenu = document.getElementById("user-profile-menu");
    if (!authButtons || !profileMenu) return;

    authButtons.classList.remove("invisible");

    if (!session) {
        authButtons.classList.remove("hidden");
        authButtons.classList.add("flex");
        profileMenu.classList.add("hidden");
        profileMenu.classList.remove("flex");
        return;
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, status")
        .eq("id", session.user.id)
        .single();

    // A suspended user is signed out right away (the navbar then shows Sign In).
    if (profile && profile.status === "suspended") {
        await supabase.auth.signOut();
        return;
    }

    authButtons.classList.add("hidden");
    profileMenu.classList.remove("hidden");
    profileMenu.classList.add("flex");

    const name = (profile && profile.full_name) || session.user.email || "User";
    const avatar = document.getElementById("navAvatar");
    const navName = document.getElementById("navName");
    if (avatar) avatar.textContent = (name.trim().charAt(0) || "U").toUpperCase();
    if (navName) navName.textContent = name;
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "index.html";
}

// Brand: swap the plain "PakGig" header text for the logo (see brand.js).
// If this fails for any reason the page must still work, so errors are ignored.
import("./brand.js").catch(function () {});
