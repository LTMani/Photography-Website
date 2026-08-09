/* ==========================================================================
   NARASIMHA STILLS - INTERACTIVE LOGIC & ADMIN DASHBOARD APP.JS
   ========================================================================== */

// ==========================================================================
// GOOGLE FIREBASE CLOUD FIRESTORE CONFIGURATION
// Replace the keys below with your Google Firebase Console credentials
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyNarasimhaStillsFirebaseKey2026",
  authDomain: "narasimha-stills.firebaseapp.com",
  projectId: "narasimha-stills-website",
  storageBucket: "narasimha-stills.appspot.com",
  messagingSenderId: "837457121300",
  appId: "1:837457121300:web:narasimharao2026"
};

let db = null;
let useFirebase = false;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps) {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      useFirebase = true;
      console.log('🔥 Google Firebase Cloud Firestore connected successfully!');
      setupFirebaseRealtimeListeners();
    }
  } catch (err) {
    console.warn('Firebase initialization note: Using local storage cache.', err.message);
    useFirebase = false;
  }
}

function setupFirebaseRealtimeListeners() {
  if (!useFirebase || !db) return;

  // 1. Realtime Customer Bookings Sync
  db.collection('bookings').onSnapshot((snapshot) => {
    const firestoreBookings = [];
    snapshot.forEach(doc => {
      firestoreBookings.push(doc.data());
    });
    if (firestoreBookings.length > 0) {
      localStorage.setItem('ns_bookings', JSON.stringify(firestoreBookings));
      renderAdminBookings();
      updateKPIs();
    }
  }, (err) => {
    console.warn('Firestore Bookings note:', err.message);
  });

  // 2. Realtime Portfolio Gallery Sync
  db.collection('portfolio').onSnapshot((snapshot) => {
    const firestorePortfolio = [];
    snapshot.forEach(doc => {
      firestorePortfolio.push(doc.data());
    });
    if (firestorePortfolio.length > 0) {
      localStorage.setItem('ns_portfolio', JSON.stringify(firestorePortfolio));
      refreshHomePageData();
      renderAdminPortfolio();
      updateKPIs();
    }
  }, (err) => {
    console.warn('Firestore Portfolio note:', err.message);
  });

  // 3. Realtime Studio Contact Settings Sync
  db.collection('settings').doc('studio_config').onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      localStorage.setItem('ns_settings', JSON.stringify(data));
      applyLiveSettings();
      loadAdminSettings();
    }
  }, (err) => {
    console.warn('Firestore Settings note:', err.message);
  });

  // 4. Realtime Package Pricing Sync
  db.collection('pricing').doc('studio_pricing').onSnapshot((doc) => {
    if (doc.exists) {
      const data = doc.data();
      localStorage.setItem('ns_pricing', JSON.stringify(data));
      applyLivePricing();
      loadAdminPricing();
    }
  }, (err) => {
    console.warn('Firestore Pricing note:', err.message);
  });
}

// Initial State Data (Backed by localStorage and Firebase Cloud)
const defaultPortfolio = [];

const defaultBookings = [
  {
    id: 'BOK-101',
    name: 'Kiran & Swathi',
    email: 'kiran.reddy@gmail.com',
    phone: '+91 9876543210',
    service: 'Wedding Package',
    date: '2026-09-15',
    status: 'confirmed',
    notes: 'Requires 4K drone videography & 2 photographers.'
  },
  {
    id: 'BOK-102',
    name: 'Rama Krishna & Anusha',
    email: 'ramakrishna@outlook.com',
    phone: '+91 8765432109',
    service: 'Pre-Wedding Shoot',
    date: '2026-08-28',
    status: 'pending',
    notes: 'Destination sunset shoot near Vizag coast.'
  },
  {
    id: 'BOK-103',
    name: 'Nagarjuna & Sirisha',
    email: 'nagarjuna.s@gmail.com',
    phone: '+91 9988776655',
    service: 'Baby Milestone Studio Shoot',
    date: '2026-08-20',
    status: 'completed',
    notes: 'Family and baby theme session.'
  }
];

const defaultSettings = {
  phone: '+91 8374571213',
  email: 'lingamallutharunmanikanta@gmail.com',
  address: 'Sampath Nagar, Guntur, Andhra Pradesh 522004'
};

const defaultPricing = {
  pkgPrewedding: 30000,
  pkgWedding: 250000,
  pkgBaby: 25000
};

const defaultAddons = [
  { id: 'add-1', title: '4K Drone Aerial Videography', price: 30000 },
  { id: 'add-2', title: '2 Signature Velvet Coffee Table Albums', price: 25000 },
  { id: 'add-3', title: '4K Live YouTube / Webcast Streaming', price: 20000 }
];

let currentUploadedImageDataUrl = '';

// TOP-LEVEL GLOBAL WINDOW FUNCTIONS (AVAILABLE IMMEDIATELY FOR INLINE ONCLICK)
window.switchAdminPanel = function(panelName, targetBtn) {
  const allBtns = document.querySelectorAll('.admin-nav-btn');
  allBtns.forEach(b => b.classList.remove('active'));
  
  if (targetBtn) {
    targetBtn.classList.add('active');
  } else {
    const activeBtn = document.querySelector(`.admin-nav-btn[data-panel="${panelName}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
  
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  const panelElem = document.getElementById(`panel-${panelName}`);
  if (panelElem) panelElem.classList.add('active');
};

window.openLoginModal = function(e) {
  if (e) e.preventDefault();
  const loginOverlay = document.getElementById('login-modal');
  if (isLoggedIn()) {
    window.switchToAdminView();
  } else if (loginOverlay) {
    loginOverlay.classList.add('active');
  }
};

window.closeLoginModal = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const loginOverlay = document.getElementById('login-modal');
  if (loginOverlay) {
    loginOverlay.classList.remove('active');
  }
  return false;
};

// Cryptographic Helper: SHA-256 Hash
async function sha256Hash(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

window.handleLoginDirect = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }
  const userInput = document.getElementById('login-user');
  const passInput = document.getElementById('login-pass');
  const user = userInput ? userInput.value.trim() : '';
  const pass = passInput ? passInput.value.trim() : '';

  if (!user || !pass) {
    showToast('Please enter both staff username and password.');
    return false;
  }

  const cleanUser = user.toLowerCase();
  const isAuthorized = (cleanUser === 'admin' || cleanUser === 'narasimha' || cleanUser === 'staff') &&
                       (pass === 'admin123' || pass === 'narasimha2026' || pass === 'admin' || pass === 'staff123');

  if (isAuthorized) {
    localStorage.setItem('ns_auth_token', 'authenticated_staff_session');
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.remove('active');
    if (userInput) userInput.value = '';
    if (passInput) passInput.value = '';
    showToast('Login successful! Welcome Narasimharao garu.');
    checkAuthStatus();
    window.switchToAdminView();
  } else {
    showToast('Authentication failed: Invalid credentials.');
    alert('Authentication Failed: Invalid staff username or password.\nDefault Staff Username: admin\nDefault Staff Password: admin123');
  }
  return false;
};

window.handleLogout = function() {
  localStorage.removeItem('ns_auth_token');
  showToast('Logged out of Admin Portal.');
  checkAuthStatus();
  window.switchToPublicSite();
};

window.switchToAdminView = function() {
  if (!isLoggedIn()) {
    showToast('Please log in to access the Admin Dashboard.');
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.add('active');
    return;
  }
  const pub = document.getElementById('public-website');
  const adm = document.getElementById('admin-dashboard');
  if (pub) pub.style.display = 'none';
  if (adm) adm.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.switchToPublicSite = function() {
  const adm = document.getElementById('admin-dashboard');
  const pub = document.getElementById('public-website');
  if (adm) adm.classList.remove('active');
  if (pub) pub.style.display = 'block';
  refreshHomePageData();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.scrollToSection = function(sectionId) {
  const navMenu = document.querySelector('.nav-menu');
  const mobileToggleBtn = document.getElementById('mobile-menu-toggle');
  if (navMenu && navMenu.classList.contains('mobile-active')) {
    navMenu.classList.remove('mobile-active');
    if (mobileToggleBtn) mobileToggleBtn.innerText = '☰';
  }
  const elem = document.getElementById(sectionId);
  if (elem) {
    elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

window.scrollToBooking = function(serviceName) {
  const navMenu = document.querySelector('.nav-menu');
  const mobileToggleBtn = document.getElementById('mobile-menu-toggle');
  if (navMenu && navMenu.classList.contains('mobile-active')) {
    navMenu.classList.remove('mobile-active');
    if (mobileToggleBtn) mobileToggleBtn.innerText = '☰';
  }

  const contactSection = document.getElementById('contact');
  const serviceSelect = document.getElementById('book-service');
  const formCard = document.querySelector('.booking-form-card');
  const nameInput = document.getElementById('book-name');

  if (serviceSelect && serviceName) {
    serviceSelect.value = serviceName;
  }

  if (contactSection) {
    contactSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (formCard) {
    formCard.classList.remove('highlight-form');
    void formCard.offsetWidth;
    formCard.classList.add('highlight-form');
    setTimeout(() => formCard.classList.remove('highlight-form'), 2200);
  }

  if (nameInput) {
    setTimeout(() => nameInput.focus(), 450);
  }
};

window.toggleMobileMenu = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const navMenu = document.querySelector('.nav-menu');
  const mobileToggleBtn = document.getElementById('mobile-menu-toggle');
  if (navMenu) {
    const isActive = navMenu.classList.contains('mobile-active');
    if (isActive) {
      navMenu.classList.remove('mobile-active');
      if (mobileToggleBtn) mobileToggleBtn.innerText = '☰';
    } else {
      navMenu.classList.add('mobile-active');
      if (mobileToggleBtn) mobileToggleBtn.innerText = '✕';
    }
  }
  return false;
};

window.filterPortfolioTab = function(category, targetBtn) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(b => b.classList.remove('active'));
  
  if (targetBtn) {
    targetBtn.classList.add('active');
  } else {
    const activeBtn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
  
  renderPortfolio(category);
};

window.handleBookingSubmit = function(e) {
  if (e) e.preventDefault();
  const nameInput = document.getElementById('book-name');
  const emailInput = document.getElementById('book-email');
  const phoneInput = document.getElementById('book-phone');
  const serviceInput = document.getElementById('book-service');
  const dateInput = document.getElementById('book-date');
  const notesInput = document.getElementById('book-notes');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const service = serviceInput ? serviceInput.value : 'Wedding Package';
  const date = dateInput ? dateInput.value : '';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!name || !phone || !date) {
    showToast('Please fill out Name, Phone Number, and Event Date!');
    return;
  }

  const newBooking = {
    id: 'BOK-' + Math.floor(100 + Math.random() * 900),
    name,
    email: email || 'N/A',
    phone,
    service,
    date,
    status: 'pending',
    notes: notes || 'Direct web booking inquiry'
  };

  const currentBookings = getBookings();
  currentBookings.unshift(newBooking);
  localStorage.setItem('ns_bookings', JSON.stringify(currentBookings));

  if (useFirebase && db) {
    db.collection('bookings').doc(newBooking.id).set(newBooking).catch(err => {
      console.warn('Firestore write note:', err.message);
    });
  }

  renderAdminBookings();
  updateKPIs();

  showToast(`Thank you ${name}! Your booking inquiry has been submitted.`);
  const form = document.getElementById('booking-form');
  if (form) form.reset();
};

window.handleCalculatorBooking = function() {
  const calcEvent = document.getElementById('calc-event');
  const calcDays = document.getElementById('calc-days');
  const calcTotal = document.getElementById('calc-total');
  let serviceName = 'Wedding Package';

  if (calcEvent && calcEvent.options[calcEvent.selectedIndex]) {
    const selectedOption = calcEvent.options[calcEvent.selectedIndex];
    const eventName = selectedOption.getAttribute('data-name') || selectedOption.innerText;
    if (eventName.includes('Pre-Wedding')) serviceName = 'Pre-Wedding Shoot';
    else if (eventName.includes('Baby')) serviceName = 'Baby Milestone Shoot';
    else if (eventName.includes('Bridal')) serviceName = 'Bridal Portrait Session';
    else serviceName = 'Wedding Package';
  }

  const daysText = calcDays && calcDays.options[calcDays.selectedIndex] ? calcDays.options[calcDays.selectedIndex].innerText : '1 Day';
  const totalVal = calcTotal ? calcTotal.innerText : '';

  const notesInput = document.getElementById('book-notes');
  if (notesInput) {
    notesInput.value = `Smart AI Configurator Estimate: ${totalVal} (${serviceName}, ${daysText})`;
  }

  window.scrollToBooking(serviceName);
  showToast(`Package estimate ${totalVal} transferred to booking form!`);
};

window.downloadBrochure = function() {
  const settings = getSettings();
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('Please allow popups to view & download the Studio Pricing Brochure.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Narasimha Stills - Official Studio Pricing Brochure</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1E293B; background: #FFF; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px double #D4AF37; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #0F172A; letter-spacing: 2px; }
        .tagline { color: #D4AF37; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .section-title { font-size: 20px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-top: 30px; }
        .pkg-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .pkg-table th, .pkg-table td { border: 1px solid #E2E8F0; padding: 12px 16px; text-align: left; }
        .pkg-table th { background: #F8FAFC; font-weight: bold; color: #0F172A; }
        .price { color: #D4AF37; font-weight: bold; text-align: right; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 20px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">NARASIMHA STILLS</div>
        <div class="tagline">Luxury Wedding & Portrait Photography Studio • Est. 2004</div>
        <p style="margin-top:8px; font-size:13px; color:#64748B;">Founder: Narasimharao • Location: Guntur, Andhra Pradesh</p>
      </div>

      <div class="section-title">Official Studio Packages & Investment Menu</div>
      <table class="pkg-table">
        <thead>
          <tr>
            <th>Package Name</th>
            <th>Coverage & Deliverables</th>
            <th style="text-align:right;">Investment</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Essential Pre-Wedding Shoot</strong></td>
            <td>Full day outdoor locations, 30 Fine-Art Retouched Prints, Drone Shots, HD Trailer</td>
            <td class="price">₹30,000</td>
          </tr>
          <tr>
            <td><strong>Royal Traditional Telugu Wedding</strong></td>
            <td>Complete Muhurtham & Reception, 4K Drone Videography, 2 Velvet Albums, Live Stream</td>
            <td class="price">₹2,50,000</td>
          </tr>
          <tr>
            <td><strong>Baby Milestone Studio Session</strong></td>
            <td>Theme setups, 20 Retouched Portraits, Digital High-Res Gallery</td>
            <td class="price">₹25,000</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Premium Add-On Services</div>
      <table class="pkg-table">
        <thead>
          <tr>
            <th>Add-On Description</th>
            <th style="text-align:right;">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>4K Drone Aerial Videography</td><td class="price">+₹30,000</td></tr>
          <tr><td>2 Signature Velvet Coffee Table Albums</td><td class="price">+₹25,000</td></tr>
          <tr><td>4K Live YouTube / Webcast Streaming</td><td class="price">+₹20,000</td></tr>
        </tbody>
      </table>

      <div class="footer">
        <p><strong>Contact Studio to Reserve Dates:</strong> Phone: ${settings.phone} | Email: ${settings.email}</p>
        <p>Address: ${settings.address}</p>
        <p style="margin-top:10px; font-style:italic;">Thank you for considering Narasimha Stills to capture your timeless moments.</p>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

window.calculateEstimate = function() {
  const calcEvent = document.getElementById('calc-event');
  const calcDays = document.getElementById('calc-days');
  const calcEventPrice = document.getElementById('calc-event-price');
  const calcAddonsPrice = document.getElementById('calc-addons-price');
  const calcTotal = document.getElementById('calc-total');

  if (!calcEvent || !calcDays) return;
  const basePrice = parseFloat(calcEvent.value) || 0;
  const multiplier = parseFloat(calcDays.value) || 1;
  const subtotalEvent = basePrice * multiplier;

  let addonsTotal = 0;
  const currentAddons = document.querySelectorAll('.calc-addon');
  currentAddons.forEach(cb => {
    if (cb.checked) addonsTotal += parseFloat(cb.value) || 0;
  });

  const total = subtotalEvent + addonsTotal;

  if (calcEventPrice) calcEventPrice.innerText = `₹${subtotalEvent.toLocaleString('en-IN')}`;
  if (calcAddonsPrice) calcAddonsPrice.innerText = `₹${addonsTotal.toLocaleString('en-IN')}`;
  if (calcTotal) calcTotal.innerText = `₹${total.toLocaleString('en-IN')}`;
};

window.handleAddPortfolio = function(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('port-title').value.trim();
  const category = document.getElementById('port-category').value;
  const urlImage = document.getElementById('port-image').value.trim();
  const image = currentUploadedImageDataUrl || urlImage || 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=800&q=80';
  const description = document.getElementById('port-desc').value.trim();

  if (!title || !description) {
    showToast('Please fill out project title and description!');
    return;
  }

  const newItem = {
    id: 'p-' + Date.now(),
    title,
    category,
    image,
    description
  };

  const portfolio = getPortfolio();
  portfolio.unshift(newItem);
  localStorage.setItem('ns_portfolio', JSON.stringify(portfolio));

  refreshHomePageData();
  renderAdminPortfolio();
  updateKPIs();

  showToast(`New portfolio project "${title}" added successfully!`);
  const form = document.getElementById('add-portfolio-form');
  if (form) form.reset();
  
  currentUploadedImageDataUrl = '';
  const previewContainer = document.getElementById('image-upload-preview');
  if (previewContainer) previewContainer.style.display = 'none';
};

window.deletePortfolioItem = function(id) {
  if (confirm('Are you sure you want to delete this portfolio showcase item?')) {
    let portfolio = getPortfolio();
    portfolio = portfolio.filter(p => p.id !== id);
    localStorage.setItem('ns_portfolio', JSON.stringify(portfolio));
    refreshHomePageData();
    renderAdminPortfolio();
    updateKPIs();
    showToast('Portfolio project deleted.');
  }
};

window.handleSettingsSubmit = function(e) {
  if (e) e.preventDefault();
  const phone = document.getElementById('settings-phone').value.trim();
  const email = document.getElementById('settings-email').value.trim();
  const address = document.getElementById('settings-address').value.trim();

  const newSettings = { phone, email, address };
  localStorage.setItem('ns_settings', JSON.stringify(newSettings));
  applyLiveSettings();
  alert(`✓ Studio Contact Details saved live!\nPhone: ${phone}\nEmail: ${email}\nAddress: ${address}`);
  showToast('Studio Settings updated live on website!');
  return false;
};

window.handlePackagesSubmit = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const preInput = document.getElementById('pkg-price-prewedding');
  const wedInput = document.getElementById('pkg-price-wedding');
  const babyInput = document.getElementById('pkg-price-baby');

  const preVal = preInput ? parseFloat(preInput.value) : NaN;
  const wedVal = wedInput ? parseFloat(wedInput.value) : NaN;
  const babyVal = babyInput ? parseFloat(babyInput.value) : NaN;

  const currentPricing = getPricing();
  if (!isNaN(preVal) && preVal > 0) currentPricing.pkgPrewedding = preVal;
  if (!isNaN(wedVal) && wedVal > 0) currentPricing.pkgWedding = wedVal;
  if (!isNaN(babyVal) && babyVal > 0) currentPricing.pkgBaby = babyVal;

  localStorage.setItem('ns_pricing', JSON.stringify(currentPricing));
  applyLivePricing();
  refreshHomePageData();

  const alertBanner = document.getElementById('pkg-save-alert');
  if (alertBanner) {
    alertBanner.style.display = 'block';
    setTimeout(() => {
      alertBanner.style.display = 'none';
    }, 4000);
  }

  showToast('✓ Package Prices saved live to website & calculator!');
  alert(`✓ Package Prices Saved Live!\nWedding: ₹${currentPricing.pkgWedding.toLocaleString('en-IN')}\nPre-Wedding: ₹${currentPricing.pkgPrewedding.toLocaleString('en-IN')}\nBaby Shoot: ₹${currentPricing.pkgBaby.toLocaleString('en-IN')}`);
  return false;
};

window.handleAddAddonSubmit = function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const titleInput = document.getElementById('new-addon-title');
  const priceInput = document.getElementById('new-addon-price');
  const title = titleInput ? titleInput.value.trim() : '';
  const price = priceInput ? parseFloat(priceInput.value) || 0 : 0;

  if (!title || price <= 0) {
    showToast('Please enter a valid add-on title and price!');
    return false;
  }

  const newAddon = {
    id: 'add-' + Date.now(),
    title,
    price
  };

  const addons = getAddons();
  addons.push(newAddon);
  localStorage.setItem('ns_addons', JSON.stringify(addons));

  renderAdminAddons();
  applyLivePricing();
  alert(`✓ Custom Add-On "${title}" (₹${price.toLocaleString('en-IN')}) created live!`);
  showToast(`New add-on "${title}" created live!`);
  const form = document.getElementById('admin-add-addon-form');
  if (form) form.reset();
  return false;
};

window.updateAddonPrice = function(id, newPrice) {
  const priceVal = parseFloat(newPrice);
  if (isNaN(priceVal) || priceVal < 0) return;

  const addons = getAddons();
  const item = addons.find(a => a.id === id);
  if (item) {
    item.price = priceVal;
    localStorage.setItem('ns_addons', JSON.stringify(addons));
    renderAdminAddons();
    applyLivePricing();
    showToast(`Price for "${item.title}" updated to ₹${priceVal.toLocaleString('en-IN')}.`);
  }
};

window.deleteAddon = function(id) {
  if (confirm('Are you sure you want to delete this add-on option?')) {
    let addons = getAddons();
    addons = addons.filter(a => a.id !== id);
    localStorage.setItem('ns_addons', JSON.stringify(addons));
    renderAdminAddons();
    applyLivePricing();
    showToast('Add-on option removed.');
  }
};

window.updateBookingStatus = function(id, newStatus) {
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === id);
  if (booking) {
    booking.status = newStatus;
    localStorage.setItem('ns_bookings', JSON.stringify(bookings));
    renderAdminBookings();
    updateKPIs();
    showToast(`Booking ${id} status updated to ${newStatus.toUpperCase()}`);
  }
};

// Opening Website Splash Reveal Animation
function initOpeningSplashAnimation() {
  const splash = document.getElementById('opening-splash');
  if (!splash) return;

  const hideSplash = () => {
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      splash.style.pointerEvents = 'none';
    }, 850);
  };

  setTimeout(hideSplash, 2000);
  splash.addEventListener('click', hideSplash);
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initOpeningSplashAnimation();
  initStorage();
  initFirebase();
  refreshHomePageData();
  renderAdminBookings();
  renderAdminPortfolio();
  renderAdminAddons();
  loadAdminSettings();
  loadAdminPricing();
  checkAuthStatus();
  setupEventListeners();
  startHeroCaptionLoop();
  
  // Real-time synchronization across browser windows/tabs
  window.addEventListener('storage', () => {
    refreshHomePageData();
    renderAdminBookings();
    renderAdminPortfolio();
    renderAdminAddons();
  });
});

// Storage Helpers
function initStorage() {
  const existing = localStorage.getItem('ns_portfolio');
  if (!existing || existing.includes('p1') || existing.includes('Royal Traditional Telugu Wedding')) {
    localStorage.setItem('ns_portfolio', JSON.stringify([]));
  }
  if (!localStorage.getItem('ns_bookings')) {
    localStorage.setItem('ns_bookings', JSON.stringify(defaultBookings));
  }
  if (!localStorage.getItem('ns_settings')) {
    localStorage.setItem('ns_settings', JSON.stringify(defaultSettings));
  }
  if (!localStorage.getItem('ns_pricing')) {
    localStorage.setItem('ns_pricing', JSON.stringify(defaultPricing));
  }
  if (!localStorage.getItem('ns_addons')) {
    localStorage.setItem('ns_addons', JSON.stringify(defaultAddons));
  }
}

function getPortfolio() {
  const data = localStorage.getItem('ns_portfolio');
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.filter(item => item && item.id && !['p1','p2','p3','p4','p5','p6'].includes(item.id)) : [];
  } catch (e) {
    return [];
  }
}

function getBookings() {
  return JSON.parse(localStorage.getItem('ns_bookings')) || defaultBookings;
}

function getSettings() {
  try {
    const data = localStorage.getItem('ns_settings');
    if (!data) return defaultSettings;
    return JSON.parse(data) || defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
}

function getPricing() {
  try {
    const data = localStorage.getItem('ns_pricing');
    if (!data) return defaultPricing;
    const parsed = JSON.parse(data);
    return {
      pkgPrewedding: typeof parsed.pkgPrewedding === 'number' ? parsed.pkgPrewedding : 30000,
      pkgWedding: typeof parsed.pkgWedding === 'number' ? parsed.pkgWedding : 250000,
      pkgBaby: typeof parsed.pkgBaby === 'number' ? parsed.pkgBaby : 25000
    };
  } catch (e) {
    return defaultPricing;
  }
}

function getAddons() {
  try {
    const data = localStorage.getItem('ns_addons');
    if (!data) return defaultAddons;
    return JSON.parse(data) || defaultAddons;
  } catch (e) {
    return defaultAddons;
  }
}

// Live Home Page Synchronization
function refreshHomePageData() {
  const activeBtn = document.querySelector('.filter-btn.active');
  const cat = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
  renderPortfolio(cat);
  applyLiveSettings();
  applyLivePricing();
  loadAdminSettings();
  loadAdminPricing();
}

function applyLivePricing() {
  const p = getPricing();
  const addons = getAddons();
  
  // Package Cards
  const elPre = document.getElementById('display-price-prewedding');
  const elWed = document.getElementById('display-price-wedding');
  const elBaby = document.getElementById('display-price-baby');
  
  if (elPre) elPre.innerText = `₹${p.pkgPrewedding.toLocaleString('en-IN')}`;
  if (elWed) elWed.innerText = `₹${p.pkgWedding.toLocaleString('en-IN')}`;
  if (elBaby) elBaby.innerText = `₹${p.pkgBaby.toLocaleString('en-IN')}`;

  // Event Calculator Dropdown Options
  const calcEvent = document.getElementById('calc-event');
  if (calcEvent) {
    if (calcEvent.options[0]) calcEvent.options[0].value = p.pkgWedding;
    if (calcEvent.options[1]) calcEvent.options[1].value = p.pkgPrewedding;
    if (calcEvent.options[2]) calcEvent.options[2].value = p.pkgBaby;
  }

  // Populate Calculator Checkbox Add-Ons
  const checkboxContainer = document.querySelector('.calc-checkbox-group');
  if (checkboxContainer) {
    checkboxContainer.innerHTML = addons.map((item, idx) => `
      <label class="calc-checkbox">
        <input type="checkbox" class="calc-addon" value="${item.price}" ${idx < 2 ? 'checked' : ''} onchange="window.calculateEstimate()" />
        ${item.title} (+₹${item.price.toLocaleString('en-IN')})
      </label>
    `).join('');

    document.querySelectorAll('.calc-addon').forEach(cb => {
      cb.addEventListener('change', () => window.calculateEstimate());
      cb.addEventListener('input', () => window.calculateEstimate());
    });
  }

  if (typeof window.calculateEstimate === 'function') window.calculateEstimate();
}

function applyLiveSettings() {
  const s = getSettings();
  const cleanPhone = s.phone ? s.phone.replace(/[^\d+]/g, '') : '+918374571213';
  
  // 1. Phone number links & text across entire website
  document.querySelectorAll('a[href^="tel:"]').forEach(el => {
    el.href = `tel:${cleanPhone}`;
    if (el.innerText.includes('Call')) {
      el.innerText = `📞 Call ${s.phone}`;
    } else if (el.innerText.includes('Phone:')) {
      el.innerText = `Phone: ${s.phone}`;
    } else if (!el.children.length) {
      el.innerText = s.phone;
    }
  });

  // 2. Footer Links
  const footerPhone = document.getElementById('footer-phone-link');
  if (footerPhone) {
    footerPhone.href = `tel:${cleanPhone}`;
    footerPhone.innerText = `Phone: ${s.phone}`;
  }

  const footerAddress = document.getElementById('footer-address-link');
  if (footerAddress) {
    footerAddress.innerText = s.address;
  }

  // 3. WhatsApp Links
  const waClean = cleanPhone.replace('+', '');
  const waUrl = `https://wa.me/${waClean}?text=Hi%20Narasimha%20Stills,%20I%20want%20to%20book%20a%20photo%20session.`;
  document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
    el.href = waUrl;
  });

  // 4. Email links
  document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
    el.href = `mailto:${s.email}`;
    if (!el.children.length) el.innerText = s.email;
  });
}

// Portfolio Filtering & Rendering
function renderPortfolio(category = 'all') {
  const container = document.getElementById('portfolio-grid');
  if (!container) return;

  const items = getPortfolio();
  const filtered = category === 'all' ? items : items.filter(item => item.category === category);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 60px 20px; background: #FFFFFF; border-radius: var(--radius-md); border: 2px dashed var(--border-color); box-shadow: var(--shadow-card);">
        <div style="font-size: 2.8rem; margin-bottom: 12px; color: var(--accent-gold-dark);">🖼</div>
        <h3 style="font-size: 1.35rem; margin-bottom: 8px; color: var(--text-main);">No Portfolio Projects Added Yet</h3>
        <p style="color: var(--text-muted); font-size: 0.94rem; max-width: 480px; margin: 0 auto 16px auto;">
          Use the <strong>Staff Admin Portal</strong> to upload your own custom photo projects & galleries!
        </p>
        <button class="btn btn-sm btn-primary" onclick="openLoginModal(event)">Open Staff Admin Portal</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="portfolio-card" data-category="${escapeHtml(item.category)}">
      <div class="portfolio-thumb-wrapper">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="portfolio-thumb" loading="lazy" />
      </div>
      <div class="portfolio-info">
        <span class="portfolio-category">${escapeHtml(getCategoryLabel(item.category))}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
    </div>
  `).join('');
}

function getCategoryLabel(cat) {
  const labels = {
    wedding: 'Telugu Wedding',
    prewedding: 'Pre-Wedding',
    portraits: 'Bridal Portrait',
    baby: 'Baby Milestone'
  };
  return labels[cat] || 'Photography';
}

// Event Listeners Setup
function setupEventListeners() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-filter');
      window.filterPortfolioTab(cat, btn);
    });
  });

  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => window.handleBookingSubmit(e));
  }

  const bookPackageBtns = document.querySelectorAll('.book-package-btn');
  bookPackageBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedService = btn.getAttribute('data-select-service');
      window.scrollToBooking(selectedService);
    });
  });

  const openLoginBtn = document.getElementById('open-login-btn');
  const closeLoginBtn = document.getElementById('close-login-btn');
  const loginOverlay = document.getElementById('login-modal');

  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', (e) => window.openLoginModal(e));
  }

  if (closeLoginBtn) {
    closeLoginBtn.addEventListener('click', () => window.closeLoginModal());
  }

  if (loginOverlay) {
    loginOverlay.addEventListener('click', (e) => {
      if (e.target === loginOverlay) window.closeLoginModal();
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => window.handleLoginDirect(e));
  }

  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => window.handleSettingsSubmit(e));
  }

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => window.handleLogout());
  }

  const switchSiteBtn = document.getElementById('switch-public-site-btn');
  if (switchSiteBtn) {
    switchSiteBtn.addEventListener('click', () => window.switchToPublicSite());
  }

  const baInput = document.getElementById('ba-slider-input');
  const baSlider = document.getElementById('ba-slider');
  const baBeforeWrapper = document.getElementById('ba-before-wrapper');
  const baHandle = document.getElementById('ba-handle');

  if (baInput && baSlider && baHandle) {
    const updateSlider = (val) => {
      const clampedVal = Math.max(0, Math.min(100, parseFloat(val) || 50));
      baSlider.style.setProperty('--ba-val', `${clampedVal}%`);
      baHandle.style.left = `${clampedVal}%`;
      if (baBeforeWrapper) {
        baBeforeWrapper.style.clipPath = `inset(0 ${100 - clampedVal}% 0 0)`;
      }
    };

    baInput.addEventListener('input', (e) => updateSlider(e.target.value));
    baInput.addEventListener('change', (e) => updateSlider(e.target.value));

    let isDragging = false;
    const processMove = (clientX) => {
      const rect = baSlider.getBoundingClientRect();
      if (!rect.width) return;
      const x = clientX - rect.left;
      const pct = (x / rect.width) * 100;
      const clamped = Math.max(0, Math.min(100, pct));
      updateSlider(clamped);
      baInput.value = clamped;
    };

    baSlider.addEventListener('pointerdown', (e) => {
      isDragging = true;
      processMove(e.clientX);
    });

    window.addEventListener('pointermove', (e) => {
      if (isDragging) processMove(e.clientX);
    });

    window.addEventListener('pointerup', () => {
      isDragging = false;
    });

    window.addEventListener('pointercancel', () => {
      isDragging = false;
    });
  }

  const calcEvent = document.getElementById('calc-event');
  const calcDays = document.getElementById('calc-days');
  const calcEventPrice = document.getElementById('calc-event-price');
  const calcAddonsPrice = document.getElementById('calc-addons-price');
  const calcTotal = document.getElementById('calc-total');
  const calcBookBtn = document.getElementById('calc-book-btn');

  function calculateEstimate() {
    if (!calcEvent || !calcDays) return;
    const basePrice = parseFloat(calcEvent.value) || 0;
    const multiplier = parseFloat(calcDays.value) || 1;
    const subtotalEvent = basePrice * multiplier;

    let addonsTotal = 0;
    const currentAddons = document.querySelectorAll('.calc-addon');
    currentAddons.forEach(cb => {
      if (cb.checked) addonsTotal += parseFloat(cb.value) || 0;
    });

    const total = subtotalEvent + addonsTotal;

    if (calcEventPrice) calcEventPrice.innerText = `₹${subtotalEvent.toLocaleString('en-IN')}`;
    if (calcAddonsPrice) calcAddonsPrice.innerText = `₹${addonsTotal.toLocaleString('en-IN')}`;
    if (calcTotal) calcTotal.innerText = `₹${total.toLocaleString('en-IN')}`;
  }

  if (calcEvent) calcEvent.addEventListener('change', calculateEstimate);
  if (calcDays) calcDays.addEventListener('change', calculateEstimate);

  if (calcBookBtn) {
    calcBookBtn.addEventListener('click', window.handleCalculatorBooking);
  }

  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const faqItem = btn.parentElement;
      const isActive = faqItem.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));
      if (!isActive) faqItem.classList.add('active');
    });
  });

  const adminNavBtns = document.querySelectorAll('.admin-nav-btn');
  adminNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPanel = btn.getAttribute('data-panel');
      window.switchAdminPanel(targetPanel, btn);
    });
  });

  const addPortfolioForm = document.getElementById('add-portfolio-form');
  if (addPortfolioForm) {
    addPortfolioForm.addEventListener('submit', (e) => window.handleAddPortfolio(e));
  }

  const pkgForm = document.getElementById('admin-packages-form');
  if (pkgForm) {
    pkgForm.addEventListener('submit', (e) => window.handlePackagesSubmit(e));
  }

  const addAddonForm = document.getElementById('admin-add-addon-form');
  if (addAddonForm) {
    addAddonForm.addEventListener('submit', (e) => window.handleAddAddonSubmit(e));
  }

  const fileInput = document.getElementById('port-file');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          currentUploadedImageDataUrl = evt.target.result;
          const previewContainer = document.getElementById('image-upload-preview');
          const previewImg = document.getElementById('upload-preview-img');
          if (previewContainer && previewImg) {
            previewImg.src = currentUploadedImageDataUrl;
            previewContainer.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const navMenu = document.querySelector('.nav-menu');
      const mobileToggleBtn = document.getElementById('mobile-menu-toggle');
      if (navMenu) navMenu.classList.remove('mobile-active');
      if (mobileToggleBtn) mobileToggleBtn.innerText = '☰';
    });
  });
}

function handleLogin(e) {
  if (e) e.preventDefault();
  window.handleLoginDirect(e);
}

function isLoggedIn() {
  return localStorage.getItem('ns_auth_token') === 'authenticated_staff_session';
}

function checkAuthStatus() {
  const loginNavBtn = document.getElementById('open-login-btn');
  if (loginNavBtn) {
    if (isLoggedIn()) {
      loginNavBtn.innerText = '⚙ Admin Portal';
      loginNavBtn.classList.remove('btn-outline');
      loginNavBtn.classList.add('btn-primary');
    } else {
      loginNavBtn.innerText = 'Staff Login';
      loginNavBtn.classList.remove('btn-primary');
      loginNavBtn.classList.add('btn-outline');
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderAdminBookings() {
  const tableBody = document.getElementById('admin-bookings-table');
  if (!tableBody) return;

  const bookings = getBookings();

  tableBody.innerHTML = bookings.map(b => `
    <tr>
      <td><strong>${escapeHtml(b.id)}</strong></td>
      <td>
        <div><strong>${escapeHtml(b.name)}</strong></div>
        <div style="font-size:0.8rem; color: var(--text-muted);">${escapeHtml(b.email)} | ${escapeHtml(b.phone)}</div>
      </td>
      <td>${escapeHtml(b.service)}</td>
      <td>${escapeHtml(b.date)}</td>
      <td><span class="badge badge-${escapeHtml(b.status)}">${escapeHtml(b.status)}</span></td>
      <td>
        ${b.status === 'pending' ? `<button class="btn btn-sm btn-primary" onclick="updateBookingStatus('${escapeHtml(b.id)}', 'confirmed')">Confirm</button>` : ''}
        ${b.status === 'confirmed' ? `<button class="btn btn-sm btn-outline" onclick="updateBookingStatus('${escapeHtml(b.id)}', 'completed')">Complete</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function renderAdminPortfolio() {
  const container = document.getElementById('admin-portfolio-grid');
  if (!container) return;

  const portfolio = getPortfolio();

  container.innerHTML = portfolio.map(item => `
    <div class="portfolio-card">
      <div class="portfolio-thumb-wrapper">
        <img src="${item.image}" alt="${item.title}" class="portfolio-thumb" />
      </div>
      <div class="portfolio-info">
        <span class="portfolio-category">${getCategoryLabel(item.category)}</span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <div style="margin-top:16px;">
          <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="deletePortfolioItem('${item.id}')">Delete Project</button>
        </div>
      </div>
    </div>
  `).join('');
}

function loadAdminSettings() {
  const s = getSettings();
  const phoneInput = document.getElementById('settings-phone');
  const emailInput = document.getElementById('settings-email');
  const addrInput = document.getElementById('settings-address');
  if (phoneInput) phoneInput.value = s.phone;
  if (emailInput) emailInput.value = s.email;
  if (addrInput) addrInput.value = s.address;
}

function loadAdminPricing() {
  const p = getPricing();
  const preInput = document.getElementById('pkg-price-prewedding');
  const wedInput = document.getElementById('pkg-price-wedding');
  const babyInput = document.getElementById('pkg-price-baby');

  if (preInput) preInput.value = p.pkgPrewedding;
  if (wedInput) wedInput.value = p.pkgWedding;
  if (babyInput) babyInput.value = p.pkgBaby;
}

function renderAdminAddons() {
  const container = document.getElementById('admin-addons-list');
  if (!container) return;

  const addons = getAddons();

  container.innerHTML = addons.map(item => `
    <div style="background: #FFFFFF; padding: 14px 18px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
      <div style="flex-grow: 1; min-width: 160px;">
        <strong style="font-size: 0.95rem; color: var(--text-main); display: block;">${item.title}</strong>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Current Price: ₹${item.price.toLocaleString('en-IN')}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="number" value="${item.price}" class="form-input" style="width: 110px; padding: 8px 10px; font-size: 0.88rem;" onchange="updateAddonPrice('${item.id}', this.value)" />
        <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: var(--danger); padding: 7px 12px;" onclick="deleteAddon('${item.id}')">🗑 Remove</button>
      </div>
    </div>
  `).join('');
}

function updateKPIs() {
  const bookings = getBookings();
  const portfolio = getPortfolio();

  const totalInquiries = bookings.length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  
  let totalRev = 0;
  bookings.forEach(b => {
    if (b.service.includes('Wedding')) totalRev += 250000;
    else if (b.service.includes('Pre-Wedding')) totalRev += 30000;
    else totalRev += 25000;
  });

  const kpiInq = document.getElementById('kpi-inquiries');
  const kpiPending = document.getElementById('kpi-pending');
  const kpiPort = document.getElementById('kpi-portfolio-count');
  const kpiRev = document.getElementById('kpi-revenue');

  if (kpiInq) kpiInq.innerText = totalInquiries;
  if (kpiPending) kpiPending.innerText = pendingCount;
  if (kpiPort) kpiPort.innerText = portfolio.length;
  if (kpiRev) kpiRev.innerText = `₹${totalRev.toLocaleString('en-IN')}`;
}

function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function startHeroCaptionLoop() {
  const typingElem = document.getElementById('hero-typing-text');
  const quoteElem = document.getElementById('hero-typing-quote');
  if (!typingElem || !quoteElem) return;

  const words = [
    "Timeless",
    "Royal Telugu",
    "Unforgettable",
    "Pre-Wedding",
    "Cinematic",
    "Cherished"
  ];

  const quotes = [
    "Every wedding is a love story; we make your moments live forever.",
    "Preserving sacred vows, candid smiles, and timeless heritage.",
    "Weddings pass in a heartbeat; cinematic photos last forever.",
    "Behind every Telugu ritual lies a story waiting to be captured.",
    "We capture how it felt to love and celebrate on your special day."
  ];

  let wordIndex = 0;
  let isDeletingWord = false;
  let currentWord = words[0];
  let wordCharIndex = currentWord.length;

  function typeWord() {
    const targetWord = words[wordIndex];

    if (isDeletingWord) {
      currentWord = targetWord.substring(0, wordCharIndex - 1);
      wordCharIndex--;
    } else {
      currentWord = targetWord.substring(0, wordCharIndex + 1);
      wordCharIndex++;
    }

    typingElem.innerText = currentWord;

    let speed = isDeletingWord ? 60 : 120;

    if (!isDeletingWord && wordCharIndex === targetWord.length) {
      speed = 2500;
      isDeletingWord = true;
    } else if (isDeletingWord && wordCharIndex === 0) {
      isDeletingWord = false;
      wordIndex = (wordIndex + 1) % words.length;
      speed = 400;
    }

    setTimeout(typeWord, speed);
  }

  let quoteIndex = 0;
  quoteElem.innerText = quotes[0];
  quoteElem.style.transition = 'opacity 0.4s ease';

  setInterval(() => {
    quoteElem.style.opacity = '0';
    setTimeout(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      quoteElem.innerText = quotes[quoteIndex];
      quoteElem.style.opacity = '1';
    }, 400);
  }, 5000);

  typeWord();
}
