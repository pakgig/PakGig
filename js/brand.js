/* PakGig - brand and theme helper (loaded on every page)
   1. Replaces the plain "PakGig" text link in the page header with the logo
      (icon + wordmark + slogan). The logo is still a link to the homepage.
   2. Sets the logo as the browser-tab icon.
   3. Applies one shared look everywhere: the Inter font, one footer colour,
      and the same top menu (Home, Services, Dashboard, Orders, Messages,
      Wallet, Profile, Logout) on every signed-in page, including on phones.
      Admin pages keep their own admin menu, with a Home link added.
   4. Adds the standard footer (legal links) to signed-in pages that have none.
      On pages built as a side-by-side layout (admin panel) the footer goes
      inside the main column so it never squeezes the page.
   If anything here fails the page must still work, so every step is guarded. */
(function () {
    if (window.__pgBrandLoaded) return;
    window.__pgBrandLoaded = true;

    var APP_LINKS = [
        ["Home", "index.html"],
        ["Services", "Services.html"],
        ["Dashboard", "dashboard.html"],
        ["Orders", "order.html"],
        ["Messages", "messages.html"],
        ["Wallet", "escrow.html"],
        ["Profile", "profile.html"]
    ];

    var FOOTER_LINKS = [
        ["Privacy Policy", "privacy.html"],
        ["Terms & Conditions", "terms.html"],
        ["Cancellation, Return & Refund Policy", "refund-policy.html"],
        ["Ownership Statement", "ownership-statement.html"],
        ["Contact Us", "contact.html"]
    ];

    var CSS =
        /* one font on every page */
        "body{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif !important}" +
        /* one footer look on every page */
        "footer{background:#0f172a !important;color:#9ca3af !important;border-top:0 !important}" +
        "footer a{color:#9ca3af !important}" +
        "footer a:hover{color:#ffffff !important}" +
        /* shared signed-in top menu */
        ".pg-appnav{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:6px 18px;font-size:14px;font-weight:500}" +
        ".pg-appnav a{color:#4b5563;text-decoration:none;white-space:nowrap}" +
        ".pg-appnav a:hover{color:#047857}" +
        ".pg-appnav a.pg-active{color:#047857;font-weight:700}" +
        ".pg-appnav a[data-logout]:hover{color:#dc2626}" +
        "@media (max-width:640px){.pg-appnav{gap:4px 12px;font-size:13px}}" +
        /* admin top bar and menu links never wrap onto two lines */
        "header a,body > nav a,aside a{white-space:nowrap}" +
        /* the injected footer */
        ".pg-footer{margin-top:48px;font-size:12px;text-align:center;padding:24px 16px;width:100%;flex:none}" +
        ".pg-footer nav{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px;margin-bottom:12px}" +
        ".pg-footer a{text-decoration:none}" +
        ".pg-footer a:hover{text-decoration:underline}";

    function currentPage() {
        var p = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
        return p || "index.html";
    }

    function addHead() {
        // Browser tab icon
        if (!document.querySelector('link[rel="icon"]')) {
            var ic = document.createElement("link");
            ic.rel = "icon";
            ic.type = "image/svg+xml";
            ic.href = "logo.svg";
            document.head.appendChild(ic);
        }
        // Inter font (some pages already load it; loading twice is harmless)
        if (!document.querySelector('link[href*="family=Inter"]')) {
            var f = document.createElement("link");
            f.rel = "stylesheet";
            f.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap";
            document.head.appendChild(f);
        }
        var st = document.createElement("style");
        st.setAttribute("data-pg-theme", "1");
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    function brandHeaderLogo() {
        // Header logo: any link to the homepage whose text is just "PakGig"
        var links = document.querySelectorAll('a[href="index.html"]');
        for (var i = 0; i < links.length; i++) {
            var a = links[i];
            if (a.getAttribute("data-branded")) continue;
            var t = (a.textContent || "").replace(/\s+/g, "").toLowerCase();
            if (t !== "pakgig") continue;
            a.setAttribute("data-branded", "1");
            a.setAttribute("aria-label", "PakGig - Your Digital Workplace - go to homepage");
            a.style.display = "inline-flex";
            a.style.alignItems = "center";
            a.style.gap = "8px";
            a.style.textDecoration = "none";
            a.innerHTML =
                '<img src="logo.svg" alt="PakGig logo" style="height:38px;width:auto;display:block">' +
                '<span style="display:flex;flex-direction:column;line-height:1.1">' +
                    '<span style="font-weight:800;letter-spacing:-0.02em;color:#2f8f3a">Pak<span style="color:#0b63b8">Gig</span></span>' +
                    '<span style="font-size:9px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;margin-top:2px;white-space:nowrap">Your Digital Workplace</span>' +
                '</span>';
        }
    }

    // Admin pages keep their own menu; a Home link is added to each menu
    // they have (simple top bar, phone header, and computer sidebar).
    function addHomeToAdminNav() {
        // 1) Simple top bar (admin-kyc.html)
        var nav = document.querySelector("body > nav");
        if (nav) {
            var out = nav.querySelector("[data-logout]");
            var box = out && out.parentElement;
            if (box && !box.getAttribute("data-pg-home")) {
                box.setAttribute("data-pg-home", "1");
                var first = box.querySelector("a");
                var a = document.createElement("a");
                a.textContent = "Home";
                a.href = "index.html";
                a.className = "hover:text-emerald-700";
                box.insertBefore(a, first || out);
            }
        }
        // 2) Phone header (admin.html): Home before the first link
        var hdrOut = document.querySelector("header [data-logout]");
        var hdrBox = hdrOut && hdrOut.parentElement;
        if (hdrBox && !hdrBox.getAttribute("data-pg-home")) {
            hdrBox.setAttribute("data-pg-home", "1");
            var firstLink = hdrBox.querySelector("a");
            var h = document.createElement("a");
            h.textContent = "Home";
            h.href = "index.html";
            h.className = "md:hidden text-xs font-semibold text-gray-600";
            hdrBox.insertBefore(h, firstLink || hdrOut);
        }
        // 3) Computer sidebar (admin.html): Home at the top of the menu
        var side = document.getElementById("sideNav");
        if (side && !side.getAttribute("data-pg-home")) {
            side.setAttribute("data-pg-home", "1");
            var s = document.createElement("a");
            s.href = "index.html";
            s.className = "w-full text-left px-3 py-2 rounded-lg font-medium flex items-center gap-2 text-gray-600 hover:bg-gray-50";
            s.textContent = "\uD83C\uDFE0 Home";
            side.insertBefore(s, side.firstChild);
        }
    }

    // Same top menu on every signed-in page that has the simple top bar.
    // The existing Logout link is kept (not replaced) so its click handler still works.
    function unifyAppNav() {
        if (currentPage().indexOf("admin") === 0) { addHomeToAdminNav(); return; }
        var nav = document.querySelector("body > nav");
        if (!nav) return;
        var out = nav.querySelector("[data-logout]");
        if (!out) return;
        var box = out.parentElement;
        if (!box || box.getAttribute("data-pg-nav")) return;
        box.setAttribute("data-pg-nav", "1");
        box.className = "pg-appnav";

        Array.prototype.slice.call(box.children).forEach(function (c) {
            if (c !== out) box.removeChild(c);
        });

        var here = currentPage();
        APP_LINKS.forEach(function (item) {
            var a = document.createElement("a");
            a.textContent = item[0];
            a.href = item[1];
            if (item[1].toLowerCase() === here) a.className = "pg-active";
            box.insertBefore(a, out);
        });
        out.className = "";
        out.style.cssText = "";
    }

    // Signed-in pages that have no footer get the standard one.
    // Login/sign-up style pages (centered card) and the full-screen chat page are skipped.
    function addFooterIfMissing() {
        if (document.querySelector("footer")) return;
        var cls = document.body.className || "";
        if (cls.indexOf("justify-center") !== -1 || cls.indexOf("overflow-hidden") !== -1) return;

        var f = document.createElement("footer");
        f.className = "pg-footer";
        var links = FOOTER_LINKS.map(function (l) {
            return '<a href="' + l[1] + '">' + l[0].replace("&", "&amp;") + "</a>";
        }).join("");
        f.innerHTML = "<nav>" + links + "</nav><p>&copy; 2026 PakGig Marketplace. All rights reserved.</p>";

        // A side-by-side page (body is a row, e.g. the admin panel with its
        // sidebar): put the footer inside the main column, not beside it.
        var tokens = cls.split(/\s+/);
        var isRow = tokens.indexOf("flex") !== -1 && tokens.indexOf("flex-col") === -1;
        if (isRow) {
            var col = document.querySelector("body > div.flex-1") || document.querySelector("body > div");
            if (!col) return;
            f.style.marginTop = "0";
            col.appendChild(f);
            return;
        }
        document.body.appendChild(f);
    }

    function apply() {
        try { addHead(); } catch (e) {}
        try { brandHeaderLogo(); } catch (e) {}
        try { unifyAppNav(); } catch (e) {}
        try { addFooterIfMissing(); } catch (e) {}
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", apply);
    } else {
        apply();
    }
})();
