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

      intakeTitle.textContent = course.intake;
      courseCategory.textContent = course.category;
      courseName.textContent = course.name;
      courseSub.textContent = course.sub;

      filledSeats.textContent = `${course.filled} / ${course.total}`;
      remainingSeats.textContent = remaining;
      ctaSeatsLeft.textContent = remaining;

      seatProgress.style.width = `${progressPercent}%`;
      warningText.innerHTML = getWarningMessage(remaining);

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

    updateAll();

    setInterval(rotateCourse, 3500);

// C-25 static page menu active state
(function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) {
      link.classList.toggle('active', href === currentPage);
    }
  });
})();

