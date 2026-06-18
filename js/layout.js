document.addEventListener("DOMContentLoaded", async () => {
  await loadSharedPart("site-header", "shared/header.html");
  await loadSharedPart("site-footer", "shared/footer.html");

  setupActiveMenu();
  setupMobileMenu();
  setupDemoSignIn();
  setupCloseDropdownOutside();
});

/* LOAD SHARED HEADER / FOOTER */
async function loadSharedPart(targetId, filePath) {
  const target = document.getElementById(targetId);

  if (!target) {
    console.warn(`Missing element: #${targetId}`);
    return;
  }

  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Cannot load ${filePath}. Status: ${response.status}`);
    }

    const html = await response.text();
    target.innerHTML = html;
  } catch (error) {
    console.error(error);

    target.innerHTML = `
      <div style="padding:16px; background:#300; color:white; font-family:Arial;">
        Failed to load ${filePath}. 
        Please check your folder path or use Live Server / Vercel.
      </div>
    `;
  }
}

/* ACTIVE MENU */
function setupActiveMenu() {
  const currentFile = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const menuLinks = document.querySelectorAll(".main-menu a");

  menuLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const linkFile = (href.split("#")[0].split("/").pop() || "index.html").toLowerCase();

    link.classList.toggle("active", linkFile === currentFile);
  });
}

/* MOBILE MENU */
function setupMobileMenu() {
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const menu = document.getElementById("mainMenu");

  if (!mobileBtn || !menu) return;

  mobileBtn.addEventListener("click", () => {
    menu.classList.toggle("show");
  });

  const menuLinks = menu.querySelectorAll("a");

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("show");
    });
  });
}

/* DEMO SIGN IN */
function setupDemoSignIn() {
  const authArea = document.getElementById("authArea");
  const signInBtn = document.getElementById("signInBtn");

  if (!authArea) return;

  if (localStorage.getItem("tne_demo_signed_in") === "true") {
    renderSignedInUser();
    return;
  }

  if (!signInBtn) return;

  signInBtn.addEventListener("click", (event) => {
    event.preventDefault();
    localStorage.setItem("tne_demo_signed_in", "true");
    renderSignedInUser();
  });
}

/* SHOW USER AVATAR */
function renderSignedInUser() {
  const authArea = document.getElementById("authArea");

  if (!authArea) return;

  authArea.innerHTML = `
    <div class="user-menu">
      <button class="user-avatar" id="userAvatar" type="button" aria-label="User menu">
        U
      </button>

      <div class="user-dropdown" id="userDropdown">
        <a href="dashboard.html">Dashboard</a>
        <a href="profile.html">Profile</a>
        <button type="button" id="logoutBtn">Logout</button>
      </div>
    </div>
  `;

  const userAvatar = document.getElementById("userAvatar");
  const userDropdown = document.getElementById("userDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  if (userAvatar && userDropdown) {
    userAvatar.addEventListener("click", (event) => {
      event.stopPropagation();
      userDropdown.classList.toggle("show");
    });

    userDropdown.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("tne_demo_signed_in");
      window.location.reload();
    });
  }
}

/* CLOSE USER DROPDOWN WHEN CLICK OUTSIDE */
function setupCloseDropdownOutside() {
  document.addEventListener("click", () => {
    const dropdown = document.getElementById("userDropdown");

    if (dropdown) {
      dropdown.classList.remove("show");
    }
  });
}