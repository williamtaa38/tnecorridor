const c25SeatData = [
  {
    category: "AI & Data Pathway",
    intake: "September 2025 Intake",
    filled: 18,
    total: 25,
    sub: "High demand from technology students",
  },
  {
    category: "Business Pathway",
    intake: "September 2025 Intake",
    filled: 14,
    total: 25,
    sub: "Popular route for management and finance students",
  },
  {
    category: "Engineering Pathway",
    intake: "September 2025 Intake",
    filled: 9,
    total: 25,
    sub: "Strong pathway for technical and industry careers",
  },
];

const testimonials = [
  {
    name: "Ahmad Firdaus",
    course: "BSc Data Science<br />University of Sunderland, UK",
    quote: "I received my offer much faster through C-25. The support and guidance were amazing throughout the process!",
  },
  {
    name: "Nur Aisyah",
    course: "Business Management<br />UK Pathway Student",
    quote: "The C-25 process helped me understand my options clearly and move faster with confidence.",
  },
  {
    name: "Daniel Tan",
    course: "Engineering Pathway<br />Partner University Route",
    quote: "The priority group made the admission journey more structured, faster and easier to follow.",
  },
  {
    name: "Priya Nair",
    course: "Computer Science<br />UK Degree Pathway",
    quote: "I liked that everything was guided step by step, from programme selection to application readiness.",
  },
];

let seatIndex = 0;
let testimonialIndex = 0;
let lastRemaining = 7;

function getEl(id) {
  return document.getElementById(id);
}

function animateNumber(element, from, to, duration = 650) {
  if (!element) return;

  const start = performance.now();
  const startValue = Number.isFinite(from) ? from : to;

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(startValue + (to - startValue) * eased);
    element.textContent = String(value);

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

function renderSeatCard(data) {
  const filledSeats = getEl("filledSeats");
  const remainingSeats = getEl("remainingSeats");
  const seatProgress = getEl("seatProgress");
  const intakeTitle = getEl("intakeTitle");
  const warningText = getEl("warningText");
  const ctaSeatsLeft = getEl("ctaSeatsLeft");

  if (!filledSeats || !remainingSeats || !seatProgress) return;

  const remaining = Math.max(0, data.total - data.filled);
  const percent = Math.max(0, Math.min(100, (data.filled / data.total) * 100));

  filledSeats.textContent = `${data.filled} / ${data.total}`;
  if (intakeTitle) intakeTitle.textContent = data.intake;
  if (warningText) warningText.innerHTML = `⌛ Only ${remaining} seats remaining — <span>Don’t miss out!</span>`;

  animateNumber(remainingSeats, lastRemaining, remaining);
  animateNumber(ctaSeatsLeft, lastRemaining, remaining);

  seatProgress.style.width = `${percent}%`;
  lastRemaining = remaining;
}

function renderStatusList() {
  const list = getEl("currentStatusList");
  if (!list) return;

  list.innerHTML = c25SeatData.map((item) => {
    const remaining = Math.max(0, item.total - item.filled);
    return `
      <div class="status-item">
        <div>
          <strong>${item.category}</strong>
          <small>Only ${remaining} remaining</small>
        </div>
        <div class="status-num">${item.filled} / ${item.total}<small> Seats Filled</small></div>
      </div>
    `;
  }).join("");
}

function rotateSeats() {
  renderSeatCard(c25SeatData[seatIndex]);
  seatIndex = (seatIndex + 1) % c25SeatData.length;
}

function renderTestimonial() {
  const data = testimonials[testimonialIndex];
  const quote = getEl("testimonialQuote");
  const name = getEl("testimonialName");
  const course = getEl("testimonialCourse");
  const dots = getEl("quoteDots");

  if (quote) quote.textContent = data.quote;
  if (name) name.textContent = data.name;
  if (course) course.innerHTML = data.course;

  if (dots) {
    dots.innerHTML = testimonials.map((_, index) => (
      `<span class="${index === testimonialIndex ? "active" : ""}"></span>`
    )).join("");
  }

  testimonialIndex = (testimonialIndex + 1) % testimonials.length;
}

function addSoftSeatMovement() {
  // Simulates a live system. Replace this with Supabase/CMS data later.
  c25SeatData.forEach((item, index) => {
    const shouldMove = Math.random() > 0.82;
    const safeLimit = item.total - 1;

    if (shouldMove && item.filled < safeLimit && index !== 0) {
      item.filled += 1;
    }
  });

  renderStatusList();
}

document.addEventListener("DOMContentLoaded", () => {
  renderStatusList();
  rotateSeats();
  renderTestimonial();

  setInterval(rotateSeats, 3500);
  setInterval(renderTestimonial, 5000);
  setInterval(addSoftSeatMovement, 15000);
});
