// C-25 page scripts
// Shared header, footer, mobile menu and sign-in are handled by layout.js.

const courses = [
  {
    intake: "September 2025 Intake",
    category: "AI & Data Pathway",
    name: "AI & Data Pathway",
    sub: "Strong demand from technology students",
    total: 25,
    filled: 18
  },
  {
    intake: "September 2025 Intake",
    category: "Business Pathway",
    name: "Business Pathway",
    sub: "Popular choice for UK business degrees",
    total: 25,
    filled: 14
  },
  {
    intake: "September 2025 Intake",
    category: "Engineering Pathway",
    name: "Engineering Pathway",
    sub: "Limited seats for technical progression route",
    total: 25,
    filled: 9
  }
];

let currentIndex = 0;

const intakeTitle = document.getElementById("intakeTitle");
const courseCategory = document.getElementById("courseCategory");
const courseName = document.getElementById("courseName");
const courseSub = document.getElementById("courseSub");

const seatProgress = document.getElementById("seatProgress");
const filledSeats = document.getElementById("filledSeats");
const remainingSeats = document.getElementById("remainingSeats");
const warningText = document.getElementById("warningText");
const ctaSeatsLeft = document.getElementById("ctaSeatsLeft");
const currentStatusList = document.getElementById("currentStatusList");

function bumpNumber(element) {
  if (!element) return;

  element.classList.add("bump");

  setTimeout(() => {
    element.classList.remove("bump");
  }, 350);
}

function getRemainingClass(remaining) {
  if (remaining <= 7) return "remain-red";
  if (remaining <= 12) return "remain-gold";
  return "remain-green";
}

function getRemainingText(remaining) {
  if (remaining <= 7) return `Only ${remaining} Remaining`;
  return `${remaining} Remaining`;
}

function getWarningMessage(remaining) {
  if (remaining <= 3) {
    return `⌛ Only ${remaining} seats remaining — <span>Almost full!</span>`;
  }

  if (remaining <= 7) {
    return `⌛ Only ${remaining} seats remaining — <span>Don’t miss out!</span>`;
  }

  if (remaining <= 12) {
    return `⌛ ${remaining} seats remaining — <span>Apply early for priority access!</span>`;
  }

  return `⌛ ${remaining} seats available — <span>Registration is now open!</span>`;
}

function renderCurrentStatus() {
  if (!currentStatusList) return;

  currentStatusList.innerHTML = "";

  courses.forEach((course, index) => {
    const remaining = course.total - course.filled;
    const statusRow = document.createElement("div");

    statusRow.className = "status-row";

    if (index === currentIndex) {
      statusRow.classList.add("active-status");
    }

    statusRow.innerHTML = `
      <div>
        <strong>${course.name}</strong>
        <span>${course.intake.replace("September", "Sept")}</span><br>
        <span class="${getRemainingClass(remaining)}">${getRemainingText(remaining)}</span>
      </div>
      <div class="count">${course.filled} / ${course.total}</div>
    `;

    currentStatusList.appendChild(statusRow);
  });
}

function updateLiveSeatCard(course) {
  const remaining = course.total - course.filled;
  const progressPercent = Math.round((course.filled / course.total) * 100);

  if (intakeTitle) intakeTitle.textContent = course.intake;
  if (courseCategory) courseCategory.textContent = course.category;
  if (courseName) courseName.textContent = course.name;
  if (courseSub) courseSub.textContent = course.sub;

  if (filledSeats) filledSeats.textContent = `${course.filled} / ${course.total}`;
  if (remainingSeats) remainingSeats.textContent = remaining;
  if (ctaSeatsLeft) ctaSeatsLeft.textContent = remaining;

  if (seatProgress) seatProgress.style.width = `${progressPercent}%`;
  if (warningText) warningText.innerHTML = getWarningMessage(remaining);

  bumpNumber(filledSeats);
  bumpNumber(remainingSeats);
  bumpNumber(ctaSeatsLeft);
}

function randomSeatMovement(course) {
  const direction = Math.random();

  if (direction > 0.6 && course.filled < course.total) {
    course.filled += 1;
  } else if (direction < 0.18 && course.filled > 3) {
    course.filled -= 1;
  }

  return course;
}

function updateAll() {
  const selectedCourse = courses[currentIndex];

  updateLiveSeatCard(selectedCourse);
  renderCurrentStatus();
}

function rotateCourse() {
  currentIndex = (currentIndex + 1) % courses.length;

  randomSeatMovement(courses[currentIndex]);

  updateAll();
}

if (courses.length) {
  updateAll();
  setInterval(rotateCourse, 3500);
}
