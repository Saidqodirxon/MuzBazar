// Use the global tg object defined in header.ejs
// Expand to full height
if (tg.expand) {
  try {
    tg.expand();
  } catch (e) {}
}

const themeParams = tg.themeParams || {};
// You could apply these to CSS variables if needed for perfect matching
// document.documentElement.style.setProperty('--bg-color', themeParams.bg_color);

// --- Auth Logic (for Login Page) ---
if (window.location.pathname === "/shop/login") {
  const loadingDiv = document.getElementById("loading");
  const notTelegramDiv = document.getElementById("not-telegram");
  const card = document.querySelector(".card");

  if (tg.initData) {
    // Send data to server
    console.log("Found initData, authenticating...");
    fetch("/shop/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          window.location.href = "/shop";
        } else {
          // Auth failed (e.g. invalid hash, user not found)
          loadingDiv.style.display = "none";
          // Show error alert using Telegram popup if possible, else standard alert
          tg.showAlert(
            "Xatolik: " + (data.error || "Tizimga kirishda muammo"),
            () => {
              // Optionally redirect or retry
            }
          );

          if (notTelegramDiv) {
            notTelegramDiv.style.display = "block";
            notTelegramDiv.innerHTML = `
               <i class="fas fa-exclamation-circle fa-4x" style="color:var(--danger); margin-bottom:1rem;"></i>
               <h3>Kirish rad etildi</h3>
               <p>${data.error || "Noma'lum xatolik"}</p>
             `;
          }
        }
      })
      .catch((err) => {
        console.error(err);
        loadingDiv.style.display = "none";
        alert("Server bilan aloqa yo'q");
      });
  } else {
    // Not inside Telegram (or no initData available)

    // Check for debug ID explicitly
    const urlParams = new URLSearchParams(window.location.search);
    const debugId = urlParams.get("debug_id");
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (debugId && isLocal) {
      // Debug login flow - keep loading visible
      if (loadingDiv) loadingDiv.style.display = "block";
      if (notTelegramDiv) notTelegramDiv.style.display = "none";

      fetch("/shop/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ telegramId: debugId }),
      })
        .then((res) => {
          if (!res.ok && res.status !== 400 && res.status !== 403) {
            throw new Error(`Server returned ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.success) {
            window.location.href = "/shop";
          } else {
            console.error("Login failed:", data);
            if (loadingDiv) loadingDiv.style.display = "none";
            if (notTelegramDiv) {
              notTelegramDiv.style.display = "block";
              notTelegramDiv.innerHTML = `
                <div class="alert alert-error" style="margin-top:1rem;">
                  <i class="fas fa-exclamation-triangle"></i><br>
                  <b>Kirishda xatolik:</b><br>
                  ${data.message || data.error || "Noma'lum xatolik"}
                </div>
                <div style="margin-top:1rem;">
                   <small>ID: ${debugId}</small>
                </div>
              `;
            }
          }
        })
        .catch((err) => {
          console.error("Debug login error:", err);
          if (loadingDiv) loadingDiv.style.display = "none";
          if (notTelegramDiv) {
            notTelegramDiv.style.display = "block";
            notTelegramDiv.innerHTML = `
              <div class="alert alert-error">
                <b>Tarmoq xatosi</b><br>
                ${err.message}
              </div>
            `;
          }
        });
    } else {
      // Normal "Not Telegram" flow
      if (loadingDiv) loadingDiv.style.display = "none";
      if (notTelegramDiv) notTelegramDiv.style.display = "block";
    }
  }
}

// --- Shop Logic (for Main Page) ---
// Global user ID should be set in index.ejs before this script loads
const USER_ID = window.CURRENT_USER_ID;

if (USER_ID) {
  const CART_KEY = `cart_${USER_ID}`;
  let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

  function updateCartUI() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalSum = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const cartFloating = document.getElementById("cartFloating");
    const cartCountBadge = document.getElementById("cartCountBadge");
    const cartSum = document.getElementById("cartSum");
    const cartTotalDisplay = document.getElementById("cartTotalDisplay");

    if (totalItems > 0) {
      if (cartFloating) cartFloating.style.display = "flex";
      if (cartCountBadge) cartCountBadge.textContent = totalItems;
      if (cartSum) cartSum.textContent = `${totalSum.toLocaleString()} so'm`;
    } else {
      if (cartFloating) cartFloating.style.display = "none";
      if (document.getElementById("cartModal"))
        document.getElementById("cartModal").style.display = "none";
    }

    if (cartTotalDisplay)
      cartTotalDisplay.textContent = `${totalSum.toLocaleString()} so'm`;

    // Render Modal Items
    const cartItemsDiv = document.getElementById("cartItems");
    if (cartItemsDiv) {
      if (cart.length === 0) {
        cartItemsDiv.innerHTML =
          '<div style="text-align:center; padding:1rem;">Savat bo\'sh</div>';
      } else {
        cartItemsDiv.innerHTML = cart
          .map(
            (item, index) => `
          <div class="cart-item">
            <div>
              <div style="font-weight:600; font-size:1rem;">${item.name}</div>
              <div style="font-size:0.85rem; color:var(--text-muted);">${item.price.toLocaleString()} so'm</div>
            </div>
            
            <div class="qty-controls">
              <button class="qty-btn" onclick="updateQty(${index}, -1)">
                <i class="fas fa-minus" style="font-size:0.7rem;"></i>
              </button>
              <div class="qty-val">${item.quantity}</div>
              <button class="qty-btn" onclick="updateQty(${index}, 1)">
                <i class="fas fa-plus" style="font-size:0.7rem;"></i>
              </button>
            </div>
          </div>
        `
          )
          .join("");
      }
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  // Make functions global for inline onclick handlers
  window.addToCart = function (id, name, price) {
    const existing = cart.find((x) => x.productId === id);
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ productId: id, name, price, quantity: 1 });
    }
    updateCartUI();

    // Haptic feedback
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
  };

  window.updateQty = function (index, change) {
    if (cart[index].quantity + change <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity += change;
    }
    updateCartUI();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
  };

  window.toggleCart = function () {
    const modal = document.getElementById("cartModal");
    if (!modal) return;

    if (modal.classList.contains("show")) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.style.display = "none";
      }, 300); // Wait for transition
    } else {
      if (cart.length > 0) {
        modal.style.display = "block";
        // Small delay to allow display:block to apply before adding class for transition
        requestAnimationFrame(() => {
          modal.classList.add("show");
        });
      }
    }
  };

  window.submitOrder = async function () {
    if (cart.length === 0) return;
    if (window.isSubmitting) return; // Prevent double-click
    window.isSubmitting = true;

    const btn = document.getElementById("checkoutBtn");
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuborilmoqda...';

    try {
      const response = await fetch("/shop/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items: cart }),
      });

      const result = await response.json();

      if (result.success) {
        // Clear cart
        cart = [];
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartUI();

        // Hide modal
        if (window.toggleCart) window.toggleCart();

        tg.showAlert("Buyurtmangiz qabul qilindi!", () => {
          window.location.href = "/shop/my-orders";
        });
      } else {
        tg.showAlert(
          "Xatolik: " + (result.message || result.error || "Noma'lum xatolik")
        );
        btn.disabled = false;
        btn.innerHTML = originalText;
        window.isSubmitting = false;
      }
    } catch (error) {
      console.error("Order error:", error);
      tg.showAlert("Tarmoq xatosi");
      btn.disabled = false;
      btn.innerHTML = originalText;
      window.isSubmitting = false;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    updateCartUI();
  });
}
