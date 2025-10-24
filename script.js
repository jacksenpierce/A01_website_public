const navToggle = document.querySelector('.nav-toggle');
const navigation = document.querySelector('#primary-navigation');
const yearSpan = document.querySelector('#year');

if (navToggle && navigation) {
  navToggle.addEventListener('click', () => {
    const isOpen = navigation.getAttribute('data-open') === 'true';
    navigation.setAttribute('data-open', String(!isOpen));
    navToggle.setAttribute('aria-expanded', String(!isOpen));
  });
}

if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const targetId = anchor.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);

    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      if (navigation) {
        navigation.setAttribute('data-open', 'false');
        navToggle?.setAttribute('aria-expanded', 'false');
      }
    }
  });
});
